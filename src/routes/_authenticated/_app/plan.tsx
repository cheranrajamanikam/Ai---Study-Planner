import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Panel, EmptyState } from "@/components/AppShell";
import { SubjectDialog, LevelSelect } from "@/components/SubjectDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generatePlan } from "@/lib/plan.functions";
import { useLatestPlan, useProfile, useSubjects, useTasks } from "@/lib/data";
import { computeStats, todayISO, daysUntil } from "@/lib/stats";
import type { AiPlan, GeneratePlanInput } from "@/lib/plan-schema";

export const Route = createFileRoute("/_authenticated/_app/plan")({
  validateSearch: (s: Record<string, unknown>): { mode?: "replan" } => ({ mode: s.mode === "replan" ? "replan" : undefined }),
  head: () => ({ meta: [{ title: "AI Study Plan — AI Study Planner" }] }),
  component: PlanPage,
});

const STEPS = ["Subjects", "Availability", "Preferences", "Review"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PlanPage() {
  const search = Route.useSearch();
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: profile } = useProfile();
  const { data: tasks = [] } = useTasks();
  const { data: plan } = useLatestPlan();
  const gen = useServerFn(generatePlan);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const mode = search.mode ?? "new";
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<GeneratePlanInput, "mode" | "startDate">>({
    days: 7, hoursPerDay: 3, preferredTime: "morning", daysAvailable: [1, 2, 3, 4, 5, 6],
    studyMethod: "pomodoro", revisionPreference: "spaced repetition", breakPreference: "short breaks every hour",
  });

  useEffect(() => {
    if (profile) setForm((f) => ({
      ...f,
      hoursPerDay: Number(profile.daily_hours) || f.hoursPerDay,
      preferredTime: (profile.preferred_time as GeneratePlanInput["preferredTime"]) ?? f.preferredTime,
      studyMethod: profile.study_method ?? f.studyMethod,
    }));
  }, [profile]);

  const realSubjects = subjects.filter((s) => !s.is_demo);
  const stats = computeStats(tasks.filter((t) => !t.is_demo), realSubjects);
  const hasExisting = tasks.some((t) => !t.is_demo && t.study_plan_id && !t.completed && t.scheduled_date >= todayISO());

  async function run() {
    setConfirm(false);
    setErr(null);
    setBusy(true);
    try {
      const res = await gen({ data: { ...form, mode, startDate: todayISO() } });
      await qc.invalidateQueries();
      toast.success(`Plan ready — ${res.taskCount} sessions scheduled`);
      navigate({ to: "/dashboard" });
    } catch (e) {
      const m = (e as Error).message || "Something went wrong generating your plan.";
      setErr(m);
      toast.error(m);
    } finally {
      setBusy(false);
    }
  }

  const ai = plan?.generated_data as AiPlan | undefined;

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <Panel title={mode === "replan" ? "Adjust My Plan" : "Generate My Study Plan"} meta={`Step ${step + 1} of 4`}>
          {mode === "replan" && (
            <p className="mb-4 rounded-lg bg-warm-soft px-3 py-2 text-sm">
              The AI will rebuild your remaining schedule from today, accounting for {stats.missed.length} missed session(s) and your progress.
            </p>
          )}
          <ol className="mb-6 flex gap-2" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s} className="flex-1">
                <div className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
                <p className={`mt-1.5 text-xs ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s}</p>
              </li>
            ))}
          </ol>

          {step === 0 && (
            <div className="space-y-3">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : realSubjects.length === 0 ? (
                <EmptyState title="Add your subjects first" body="The AI needs at least one subject with an exam date." />
              ) : (
                <ul className="space-y-2">
                  {realSubjects.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2.5 ring-1 ring-border">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {s.difficulty} · {s.priority} priority · {s.preparation_percentage}% · {s.exam_date ? `exam in ${daysUntil(s.exam_date)} days` : "no exam date"}
                          {s.weak_topics.length > 0 && ` · weak: ${s.weak_topics.join(", ")}`}
                        </p>
                      </div>
                      <SubjectDialog subject={s} trigger={<Button size="sm" variant="ghost">Edit</Button>} />
                    </li>
                  ))}
                </ul>
              )}
              <SubjectDialog trigger={<Button variant="outline" size="sm">+ Add subject</Button>} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Study hours per day: {form.hoursPerDay} h</Label>
                <Slider value={[form.hoursPerDay]} min={0.5} max={12} step={0.5} onValueChange={([v]) => setForm({ ...form, hoursPerDay: v })} aria-label="Hours per day" />
              </div>
              <div className="space-y-2">
                <Label>Plan length: {form.days} days</Label>
                <Slider value={[form.days]} min={3} max={21} step={1} onValueChange={([v]) => setForm({ ...form, days: v })} aria-label="Plan length" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pt">Preferred study time</Label>
                <LevelSelect id="pt" value={form.preferredTime} onChange={(v) => setForm({ ...form, preferredTime: v as never })} options={["morning", "afternoon", "evening", "night"]} />
              </div>
              <fieldset>
                <legend className="text-sm font-medium">Days available</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAYS.map((d, i) => {
                    const on = form.daysAvailable.includes(i);
                    return (
                      <button key={d} type="button" aria-pressed={on}
                        onClick={() => setForm({ ...form, daysAvailable: on ? form.daysAvailable.filter((x) => x !== i) : [...form.daysAvailable, i].sort() })}
                        className={`rounded-full px-3 py-1.5 text-sm ring-1 transition-colors ${on ? "bg-primary text-primary-foreground ring-primary" : "ring-border hover:bg-muted"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sm">Study method</Label>
                <LevelSelect id="sm" value={form.studyMethod} onChange={(v) => setForm({ ...form, studyMethod: v })} options={["pomodoro", "deep work blocks", "active recall", "spaced repetition", "practice problems"]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp">Revision</Label>
                <LevelSelect id="rp" value={form.revisionPreference} onChange={(v) => setForm({ ...form, revisionPreference: v })} options={["spaced repetition", "end of each day", "weekly review", "before exams only"]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bp">Breaks</Label>
                <LevelSelect id="bp" value={form.breakPreference} onChange={(v) => setForm({ ...form, breakPreference: v })} options={["short breaks every hour", "5 min every 25 min", "long break midday", "minimal breaks"]} />
              </div>
            </div>
          )}

          {step === 3 && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Subjects", realSubjects.map((s) => s.name).join(", ") || "—"],
                ["Window", `${form.days} days from today`],
                ["Daily limit", `${form.hoursPerDay} h, ${form.preferredTime}`],
                ["Days", form.daysAvailable.map((d) => DAYS[d]).join(", ")],
                ["Method", form.studyMethod],
                ["Revision / breaks", `${form.revisionPreference} · ${form.breakPreference}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface p-3 ring-1 ring-border">
                  <dt className="eyebrow">{k}</dt>
                  <dd className="mt-1 capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {err && <p className="mt-4 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose" role="alert">{err}</p>}

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={(step === 0 && realSubjects.length === 0) || (step === 1 && form.daysAvailable.length === 0)}>
                Next
              </Button>
            ) : (
              <Button variant="warm" className="rounded-lg" disabled={busy || realSubjects.length === 0}
                onClick={() => (hasExisting ? setConfirm(true) : run())}>
                {busy ? <><Loader2 className="animate-spin" /> Generating… (up to a minute)</> : mode === "replan" ? "Adjust My Plan" : "Generate My Study Plan"}
              </Button>
            )}
          </div>
        </Panel>
      </div>

      <div className="space-y-5 xl:col-span-5">
        <Panel title="Latest AI plan" meta={plan ? `${plan.start_date} → ${plan.end_date}` : undefined}>
          {!ai?.plan ? (
            <p className="text-sm text-muted-foreground">No plan generated yet.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {ai.summary && <p className="text-pretty">{ai.summary}</p>}
              {ai.recommendations?.length > 0 && (
                <div>
                  <p className="eyebrow mb-2">Priority recommendations</p>
                  <ul className="space-y-1.5">{ai.recommendations.map((r, i) => <li key={i}>• {r}</li>)}</ul>
                </div>
              )}
              <Link to="/calendar" className="inline-block font-medium text-primary hover:underline">View in calendar →</Link>
            </div>
          )}
        </Panel>
        {mode !== "replan" && stats.missed.length > 0 && (
          <div className="rounded-2xl bg-ink p-5 text-paper">
            <p className="font-display text-lg">Fell behind?</p>
            <p className="mt-1 text-sm text-paper/70">{stats.missed.length} sessions missed. Let the AI rebalance what's left.</p>
            <Button variant="warm" className="mt-4 rounded-lg" asChild><Link to="/plan" search={{ mode: "replan" }}>Adjust My Plan</Link></Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your current plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Unfinished AI sessions from today onward will be replaced with the new schedule. Completed sessions and tasks you created yourself are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Replace plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
