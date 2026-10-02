import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, EmptyState } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubjects, useTasks } from "@/lib/data";
import { computeStats, daysUntil } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — AI Study Planner" }] }),
  component: Analytics,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Analytics() {
  const t = useTasks();
  const s = useSubjects();
  if (t.isLoading || s.isLoading) return <div className="grid gap-5 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>;
  const st = computeStats(t.data ?? [], s.data ?? []);
  if (st.total === 0) return <EmptyState title="No data yet" body="Complete some study sessions to see analytics." />;
  const timeData = st.bySubject.filter((b) => b.hours > 0);

  const kpis: [string, string][] = [
    ["Total study hours", `${st.totalHours}h`],
    ["This week", `${st.weeklyHours}h`],
    ["Completed tasks", `${st.completed}/${st.total}`],
    ["Completion", `${st.pct}%`],
    ["Current streak", `${st.streak} days`],
    ["Most studied", st.mostStudied?.name ?? "—"],
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([k, v]) => (
          <div key={k} className="panel animate-rise p-4">
            <p className="eyebrow">{k}</p>
            <p className="mt-1 truncate font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Weekly study hours">
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={st.week}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Study time by subject">
          {timeData.length === 0 ? <p className="text-sm text-muted-foreground">No completed sessions linked to subjects yet.</p> : (
            <div className="flex h-60 items-center gap-4">
              <ResponsiveContainer width="55%">
                <PieChart>
                  <Pie data={timeData} dataKey="hours" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {timeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-sm">
                {timeData.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {d.name} · {d.hours}h
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
        <Panel title="Subject-wise progress">
          <ul className="space-y-3">
            {st.bySubject.map((b) => {
              const pct = b.total ? Math.round((b.done / b.total) * 100) : 0;
              return (
                <li key={b.id}>
                  <div className="flex justify-between text-sm"><span>{b.name}</span><span className="text-muted-foreground">{b.done}/{b.total} sessions · {b.preparation}% prepared</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Upcoming exams">
          {st.upcomingExams.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming exams.</p> : (
            <ul className="divide-y">
              {st.upcomingExams.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{e.name}</span>
                  <span className="rounded-full bg-warm-soft px-2 py-0.5 text-xs font-medium">{daysUntil(e.exam_date)} days · {e.exam_date}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
