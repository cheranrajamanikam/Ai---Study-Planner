import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel } from "@/components/AppShell";
import { TaskRow } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSubjects, useTasks, useToggleTask, type Task } from "@/lib/data";
import { endTime, fmtTime, todayISO } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — AI Study Planner" }] }),
  component: CalendarPage,
});

type View = "day" | "week" | "month";

function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  const { data: subjects = [] } = useSubjects();
  const toggle = useToggleTask();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Task | null>(null);
  const live = selected ? tasks.find((t) => t.id === selected.id) ?? null : null;

  const byDate = new Map<string, Task[]>();
  tasks.forEach((t) => byDate.set(t.scheduled_date, [...(byDate.get(t.scheduled_date) ?? []), t]));
  const exams = new Map(subjects.filter((s) => s.exam_date).map((s) => [s.exam_date!, s.name]));
  const today = todayISO();

  const step = (n: number) =>
    setCursor(view === "day" ? addDays(cursor, n) : view === "week" ? addWeeks(cursor, n) : addMonths(cursor, n));

  const title =
    view === "day" ? format(cursor, "EEEE d MMMM yyyy")
    : view === "week" ? `Week of ${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy")}`
    : format(cursor, "MMMM yyyy");

  const Chip = ({ t }: { t: Task }) => (
    <button onClick={() => setSelected(t)}
      className={`block w-full truncate rounded px-1.5 py-1 text-left text-[11px] ${t.completed ? "bg-secondary text-secondary-foreground line-through" : "bg-surface ring-1 ring-border hover:ring-primary"}`}>
      {fmtTime(t.start_time)} {t.title}
    </button>
  );

  return (
    <Panel>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="Previous" onClick={() => step(-1)}><ChevronLeft /></Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="icon" variant="outline" aria-label="Next" onClick={() => step(1)}><ChevronRight /></Button>
          <h2 className="ml-2 text-lg font-semibold">{title}</h2>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "day" && (() => {
        const iso = format(cursor, "yyyy-MM-dd");
        const list = byDate.get(iso) ?? [];
        return list.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No sessions this day.</p> : (
          <ul className="space-y-2">{list.map((t) => <TaskRow key={t.id} task={t} onOpen={() => setSelected(t)} />)}</ul>
        );
      })()}

      {view === "week" && (
        <div className="grid gap-3 md:grid-cols-7">
          {eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) }).map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            return (
              <div key={iso} className={`min-h-40 rounded-xl p-2 ring-1 ${iso === today ? "bg-secondary/50 ring-primary/40" : "bg-surface ring-border"}`}>
                <p className="mb-2 text-xs font-medium">{format(d, "EEE d")}</p>
                {exams.get(iso) && <p className="mb-1 rounded bg-warm-soft px-1.5 py-1 text-[11px] font-medium">Exam: {exams.get(iso)}</p>}
                <div className="space-y-1">{(byDate.get(iso) ?? []).map((t) => <Chip key={t.id} t={t} />)}</div>
              </div>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) }).map((d) => {
              const iso = format(d, "yyyy-MM-dd");
              const list = byDate.get(iso) ?? [];
              return (
                <button key={iso} onClick={() => { setCursor(d); setView("day"); }}
                  className={`min-h-20 rounded-lg p-1.5 text-left ring-1 ${iso === today ? "ring-primary" : "ring-border"} ${isSameMonth(d, cursor) ? "bg-surface" : "opacity-40"}`}>
                  <span className="text-xs">{format(d, "d")}</span>
                  {exams.get(iso) && <span className="mt-1 block truncate rounded bg-warm-soft px-1 text-[10px]">Exam</span>}
                  {list.length > 0 && (
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {list.filter((t) => t.completed).length}/{list.length} done
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!live} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {live && (
            <>
              <DialogHeader><DialogTitle className="font-display">{live.title}</DialogTitle></DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="eyebrow">Date</dt><dd>{format(new Date(live.scheduled_date + "T00:00"), "EEE d MMM")}</dd></div>
                <div><dt className="eyebrow">Time</dt><dd>{fmtTime(live.start_time)} – {endTime(live.start_time, live.duration)}</dd></div>
                <div><dt className="eyebrow">Duration</dt><dd>{live.duration} min</dd></div>
                <div><dt className="eyebrow">Type</dt><dd className="capitalize">{live.task_type.replace("_", " ")}</dd></div>
                <div className="col-span-2"><dt className="eyebrow">Subject</dt><dd>{subjects.find((s) => s.id === live.subject_id)?.name ?? "—"}</dd></div>
                {live.description && <div className="col-span-2"><dt className="eyebrow">Notes</dt><dd>{live.description}</dd></div>}
              </dl>
              <Button variant={live.completed ? "outline" : "default"} onClick={() => toggle.mutate({ id: live.id, completed: !live.completed })}>
                {live.completed ? "Mark as not done" : "Mark completed"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
