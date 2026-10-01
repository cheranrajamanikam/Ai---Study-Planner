import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "./data";

/** Demo rows are flagged is_demo=true so they never mix with real data. */
export async function loadDemoData() {
  const uid = await currentUserId();
  await clearDemoData();
  const d = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");

  const { data: subjects, error } = await supabase
    .from("subjects")
    .insert([
      { user_id: uid, is_demo: true, name: "Data Structures", difficulty: "hard", priority: "high", preparation_percentage: 55, exam_date: d(9), weak_topics: ["Graphs", "Heaps"] },
      { user_id: uid, is_demo: true, name: "Operating Systems", difficulty: "medium", priority: "high", preparation_percentage: 40, exam_date: d(14), weak_topics: ["Deadlocks"] },
      { user_id: uid, is_demo: true, name: "Mathematics", difficulty: "medium", priority: "medium", preparation_percentage: 70, exam_date: d(21), weak_topics: ["Probability"] },
    ])
    .select();
  if (error || !subjects) throw new Error(error?.message ?? "Demo failed");
  const [ds, os, math] = subjects;

  const { data: plan } = await supabase
    .from("study_plans")
    .insert({ user_id: uid, is_demo: true, start_date: d(-6), end_date: d(7), daily_hours: 3, generated_data: { demo: true } })
    .select("id")
    .single();

  const topics: [typeof ds, string, string][] = [
    [ds, "Arrays & strings", "study"], [os, "Processes", "study"], [math, "Probability", "practice"],
    [ds, "Linked lists", "study"], [os, "Scheduling", "revision"], [ds, "Graphs", "practice"],
  ];
  const rows = [];
  for (let day = -6; day <= 7; day++) {
    for (let i = 0; i < 3; i++) {
      const [s, topic, type] = topics[(day + 6 + i) % topics.length];
      rows.push({
        user_id: uid,
        is_demo: true,
        study_plan_id: plan?.id ?? null,
        subject_id: s.id,
        title: `${s.name} — ${topic}`,
        task_type: type,
        scheduled_date: d(day),
        start_time: ["09:00", "11:00", "19:00"][i],
        duration: [60, 60, 45][i],
        completed: day < 0 ? (day + i) % 4 !== 0 : day === 0 && i === 0,
      });
    }
  }
  const { error: tErr } = await supabase.from("tasks").insert(rows);
  if (tErr) throw new Error(tErr.message);
}

export async function clearDemoData() {
  await supabase.from("tasks").delete().eq("is_demo", true);
  await supabase.from("study_plans").delete().eq("is_demo", true);
  await supabase.from("subjects").delete().eq("is_demo", true);
}
