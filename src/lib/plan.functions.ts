import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiPlanSchema, generatePlanInput, type AiPlan } from "./plan-schema";

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * POST generatePlan — secure AI endpoint.
 * Reads the user's subjects (RLS-scoped), asks the AI for a structured plan,
 * validates it, stores the plan and turns sessions into tasks.
 */
export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => generatePlanInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { generateText, AiError } = await import("./ai-gateway.server");

    const [{ data: subjects, error: sErr }, { data: profile }] = await Promise.all([
      supabase.from("subjects").select("*").eq("is_demo", false).order("created_at"),
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    if (sErr) throw new Error("Could not load your subjects.");
    if (!subjects || subjects.length === 0) {
      throw new Error("Add at least one subject before generating a plan.");
    }

    const endDate = addDays(data.startDate, data.days - 1);
    let replanContext = "";
    if (data.mode === "replan") {
      const { data: past } = await supabase
        .from("tasks")
        .select("title, scheduled_date, completed, duration, subject_id")
        .eq("is_demo", false)
        .lt("scheduled_date", data.startDate);
      const missed = (past ?? []).filter((t) => !t.completed);
      const done = (past ?? []).filter((t) => t.completed);
      replanContext = `
This is a RE-PLAN. The student fell behind.
Completed sessions so far: ${done.length}. Missed sessions (${missed.length}):
${missed.slice(0, 40).map((t) => `- ${t.scheduled_date}: ${t.title} (${t.duration} min)`).join("\n") || "- none"}
Prioritise catching up on missed topics while protecting subjects with the nearest exams.`;
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const subjectLines = subjects
      .map(
        (s) =>
          `- ${s.name} | difficulty: ${s.difficulty} | priority: ${s.priority} | prepared: ${s.preparation_percentage}% | exam: ${s.exam_date ?? "none"} | weak topics: ${s.weak_topics.join(", ") || "none"}`,
      )
      .join("\n");

    const system = `You are an expert study coach. You build realistic, balanced study schedules.
Respond with ONLY a JSON object, no prose, matching exactly:
{"summary": string, "recommendations": string[], "plan": [{"date": "YYYY-MM-DD", "sessions": [{"subject": string, "topic": string, "startTime": "HH:MM", "duration": number, "type": "study"|"revision"|"practice"|"mock_test"|"break"}]}]}
Rules: use the exact subject names given (use "General" for breaks); durations in minutes; no overlapping sessions; total non-break minutes per day must not exceed the daily limit; only schedule on available weekdays; include revision, practice and a mock test before each exam; weight weak topics, low preparation, high priority and near exams more heavily; never schedule a subject after its exam date.`;

    const prompt = `Student: ${profile?.name ?? "Student"} (${profile?.academic_level ?? "unspecified level"}).
Plan window: ${data.startDate} to ${endDate} (${data.days} days).
Daily study limit: ${data.hoursPerDay} hours. Preferred time: ${data.preferredTime}.
Available weekdays: ${data.daysAvailable.map((d) => dayNames[d]).join(", ")}.
Study method: ${data.studyMethod}. Revision preference: ${data.revisionPreference}. Break preference: ${data.breakPreference}.
Subjects:
${subjectLines}
${replanContext}
Write 3-6 short priority recommendations.`;

    const text = await generateText(system, prompt);

    let plan: AiPlan;
    try {
      plan = aiPlanSchema.parse(extractJson(text));
    } catch {
      throw new AiError("The AI returned a plan in an unexpected format. Please try again.");
    }

    // Keep only days in range
    plan.plan = plan.plan.filter((d) => d.date >= data.startDate && d.date <= endDate);
    const byName = new Map(subjects.map((s) => [s.name.trim().toLowerCase(), s.id]));
    const taskRows = plan.plan.flatMap((day) =>
      day.sessions
        .filter((s) => s.type !== "break")
        .map((s) => ({
          user_id: userId,
          subject_id: byName.get(s.subject.trim().toLowerCase()) ?? null,
          title: `${s.subject} — ${s.topic}`,
          description: s.type === "mock_test" ? "Timed mock test" : null,
          task_type: s.type,
          scheduled_date: day.date,
          start_time: s.startTime,
          duration: s.duration,
        })),
    );
    if (taskRows.length === 0) throw new AiError("The AI produced an empty schedule. Try adjusting your inputs.");

    const { data: inserted, error: pErr } = await supabase
      .from("study_plans")
      .insert({
        user_id: userId,
        start_date: data.startDate,
        end_date: endDate,
        daily_hours: data.hoursPerDay,
        generated_data: plan as never,
      })
      .select("id")
      .single();
    if (pErr || !inserted) throw new Error("Could not save the study plan.");

    // Replace remaining (unfinished) sessions from today onward
    await supabase
      .from("tasks")
      .delete()
      .eq("completed", false)
      .eq("is_demo", false)
      .not("study_plan_id", "is", null)
      .gte("scheduled_date", data.startDate);

    const { error: tErr } = await supabase
      .from("tasks")
      .insert(taskRows.map((t) => ({ ...t, study_plan_id: inserted.id })));
    if (tErr) throw new Error("Plan saved, but tasks could not be created.");

    return { planId: inserted.id, taskCount: taskRows.length, summary: plan.summary };
  });
