import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Panel, EmptyState } from "@/components/AppShell";
import { TaskRow } from "@/components/TaskRow";
import { WeeklyChart } from "@/components/WeeklyChart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubjects, useTasks } from "@/lib/data";
import { computeStats, daysUntil } from "@/lib/stats";
import { clearDemoData, loadDemoData } from "@/lib/demo";
import { MiniCalendar } from "@/components/MiniCalendar";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AI Study Planner" }] }),
  component: Dashboard,
});

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="panel animate-rise p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const tasksQ = useTasks();
  const subjectsQ = useSubjects();
  const qc = useQueryClient();
  const [demoBusy, setDemoBusy] = useState(false);

  if (tasksQ.isLoading || subjectsQ.isLoading) {
    return (
      <div className="grid gap-5 xl:grid-cols-12">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl xl:col-span-3" />)}
        <Skeleton className="h-80 rounded-2xl xl:col-span-7" />
        <Skeleton className="h-80 rounded-2xl xl:col-span-5" />
      </div>
    );
  }
  if (tasksQ.error || subjectsQ.error) {
    return <EmptyState title="Couldn't load your dashboard" body={(tasksQ.error ?? subjectsQ.error)?.message} action={<Button onClick={() => { tasksQ.refetch(); subjectsQ.refetch(); }}>Retry</Button>} />;
  }

  const tasks = tasksQ.data ?? [];
  const subjects = subjectsQ.data ?? [];
  const s = computeStats(tasks, subjects);
  const hasDemo = tasks.some((t) => t.is_demo) || subjects.some((x) => x.is_demo);

  async function demo(load: boolean) {
    setDemoBusy(true);
    try {
      if (load) await loadDemoData();
      else await clearDemoData();
      await qc.invalidateQueries();
      toast.success(load ? "Demo data loaded" : "Demo data removed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {hasDemo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warm-soft px-4 py-3 text-sm">
          <span><strong>Demo mode:</strong> items marked DEMO are sample data, not yours.</span>
          <Button size="sm" variant="outline" disabled={demoBusy} onClick={() => demo(false)}>Remove demo data</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Today's hours" value={`${s.todayHours}h`} hint={`${s.todayDoneHours}h done`} />
        <Stat label="Completed" value={s.completedToday} hint="today" />
        <Stat label="Pending" value={s.pendingToday} hint="today" />
        <Stat label="Completion" value={`${s.todayPct}%`} hint="today" />
        <Stat label="Streak" value={`${s.streak}d`} hint="consecutive days" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel title="Today's sessions" meta={`${s.completedToday} of ${s.todayTasks.length} done`} className="xl:col-span-5">
          {s.todayTasks.length === 0 ? (
            tasks.length === 0 ? (
              <EmptyState
                title="No study plan yet."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="ink" asChild><Link to="/plan">Generate My First Study Plan</Link></Button>
                    <Button variant="outline" disabled={demoBusy} onClick={() => demo(true)}>Try demo data</Button>
                  </div>
                }
              />
            ) : (
              <EmptyState title="Nothing scheduled today" body="Enjoy the break, or add a task." action={<Button variant="outline" asChild><Link to="/tasks">Open tasks</Link></Button>} />
            )
          ) : (
            <ul className="space-y-2">{s.todayTasks.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
          )}
          {s.missed.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-rose/10 px-3 py-2 text-sm">
              <span className="text-rose">{s.missed.length} missed session{s.missed.length > 1 ? "s" : ""}</span>
              <Link to="/plan" search={{ mode: "replan" }} className="font-medium text-rose hover:underline">Adjust My Plan →</Link>
            </div>
          )}
        </Panel>

        <Panel title="Weekly hours" meta={`${s.weeklyHours} h total`} className="xl:col-span-4">
          <WeeklyChart week={s.week} />
        </Panel>

        <Panel className="xl:col-span-3">
          <MiniCalendar exams={subjects} tasks={tasks} />
        </Panel>

        <section className="xl:col-span-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Subject progress</h2>
            <span className="text-xs text-muted-foreground">{subjects.length} subjects tracked</span>
          </div>
          {subjects.length === 0 ? (
            <EmptyState title="No subjects yet" action={<Button asChild variant="outline"><Link to="/subjects">Add a subject</Link></Button>} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {subjects.slice(0, 6).map((sub) => {
                const days = daysUntil(sub.exam_date);
                const urgent = days !== null && days <= 7;
                return (
                  <div key={sub.id} className="rounded-xl bg-surface p-4 ring-1 ring-border">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{sub.name}</p>
                      {days !== null && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${urgent ? "bg-rose/15 text-rose" : "bg-secondary text-secondary-foreground"}`}>
                          {days < 0 ? "done" : `${days} days`}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{sub.exam_date ? `Exam · ${format(parseISO(sub.exam_date), "d MMM")}` : "No exam date"}</p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${sub.preparation_percentage}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{sub.preparation_percentage}% prepared</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="xl:col-span-5">
          <div className="rounded-2xl bg-ink p-6 text-paper">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-paper/50">AI Study Plan</p>
            <h2 className="mt-2 text-2xl font-semibold text-balance">Plan the next 7 days</h2>
            <p className="mt-2 text-sm text-paper/70 text-pretty">
              Balances your exam dates, weak topics and free hours into a calm, doable schedule.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-paper/10 px-3 py-2.5">
                <p className="text-xs text-paper/60">Next exam</p>
                {s.upcomingExams[0] ? `${s.upcomingExams[0].name}` : "—"}
              </div>
              <div className="rounded-lg bg-paper/10 px-3 py-2.5">
                <p className="text-xs text-paper/60">Exam in</p>
                {s.upcomingExams[0] ? `${daysUntil(s.upcomingExams[0].exam_date)} days` : "—"}
              </div>
            </div>
            <Button variant="warm" className="mt-5 w-full rounded-lg" asChild>
              <Link to="/plan">
                <span className="size-1.5 rounded-full bg-ink/70" />
                Generate AI Plan
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
