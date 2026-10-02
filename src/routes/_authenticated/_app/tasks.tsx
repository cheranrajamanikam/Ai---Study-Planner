import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Panel, EmptyState } from "@/components/AppShell";
import { TaskRow } from "@/components/TaskRow";
import { TaskDialog } from "@/components/TaskDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeleteTask, useSubjects, useTasks } from "@/lib/data";
import { todayISO } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/_app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — AI Study Planner" }] }),
  component: TasksPage,
});

type View = "today" | "upcoming" | "missed" | "completed" | "all";

function TasksPage() {
  const { data: tasks = [], isLoading, error } = useTasks();
  const { data: subjects = [] } = useSubjects();
  const del = useDeleteTask();
  const [view, setView] = useState<View>("today");
  const [subject, setSubject] = useState("all");
  const [sort, setSort] = useState("date");

  const list = useMemo(() => {
    const today = todayISO();
    let l = tasks.filter((t) => {
      if (subject !== "all" && t.subject_id !== subject) return false;
      switch (view) {
        case "today": return t.scheduled_date === today;
        case "upcoming": return t.scheduled_date > today && !t.completed;
        case "missed": return t.scheduled_date < today && !t.completed;
        case "completed": return t.completed;
        default: return true;
      }
    });
    l = [...l].sort((a, b) =>
      sort === "duration" ? b.duration - a.duration
      : sort === "title" ? a.title.localeCompare(b.title)
      : (a.scheduled_date + a.start_time).localeCompare(b.scheduled_date + b.start_time),
    );
    return l;
  }, [tasks, view, subject, sort]);

  return (
    <Panel title="Tasks" meta={`${list.length} shown`} action={<TaskDialog trigger={<Button size="sm">+ New task</Button>} />}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
            <TabsTrigger value="completed">Done</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-44" aria-label="Filter by subject"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40" aria-label="Sort tasks"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort: date</SelectItem>
            <SelectItem value="duration">Sort: duration</SelectItem>
            <SelectItem value="title">Sort: title</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState title="Couldn't load tasks" body={error.message} />
      ) : list.length === 0 ? (
        <EmptyState title="No tasks here" body="Try another filter, or create a task." />
      ) : (
        <ul className="space-y-2">
          {list.map((t) => (
            <TaskRow key={t.id} task={t} showDate={view !== "today"} actions={
              <div className="flex shrink-0">
                <TaskDialog task={t} trigger={<Button size="icon" variant="ghost" aria-label="Edit task"><Pencil /></Button>} />
                <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => confirm("Delete this task?") && del.mutate(t.id)}><Trash2 /></Button>
              </div>
            } />
          ))}
        </ul>
      )}
    </Panel>
  );
}
