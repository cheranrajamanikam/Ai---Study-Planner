import type { Task } from "@/lib/data";
import { useToggleTask } from "@/lib/data";
import { endTime, fmtTime, todayISO } from "@/lib/stats";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

const TYPE_LABEL: Record<string, string> = {
  study: "Study",
  revision: "Revision",
  practice: "Practice",
  mock_test: "Mock test",
};

export function TaskRow({ task, showDate, actions, onOpen }: { task: Task; showDate?: boolean; actions?: ReactNode; onOpen?: () => void }) {
  const toggle = useToggleTask();
  const done = task.completed;
  const missed = !done && task.scheduled_date < todayISO();
  return (
    <li
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${done ? "bg-secondary/60" : "bg-surface ring-1 ring-border"}`}
    >
      <button
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
        onClick={() => toggle.mutate({ id: task.id, completed: !done })}
        className={`grid size-5 shrink-0 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-ring ${done ? "bg-primary text-primary-foreground" : "ring-1 ring-ink/25 hover:ring-primary"}`}
      >
        {done && <Check className="size-3.5" />}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" disabled={!onOpen}>
        <p className={`truncate text-sm font-medium ${done ? "text-secondary-foreground" : ""}`}>{task.title}</p>
        <p className="text-xs text-muted-foreground">
          {showDate && `${task.scheduled_date} · `}
          {fmtTime(task.start_time)} – {endTime(task.start_time, task.duration)} · {task.duration} min ·{" "}
          {TYPE_LABEL[task.task_type] ?? task.task_type}
          {task.is_demo && <span className="ml-2 rounded bg-warm-soft px-1.5 py-0.5 text-[10px] font-medium text-ink">DEMO</span>}
        </p>
      </button>
      <span className={`shrink-0 text-xs font-medium ${done ? "text-secondary-foreground" : missed ? "text-rose" : "text-muted-foreground"}`}>
        {done ? "Done" : missed ? "Missed" : "To do"}
      </span>
      {actions}
    </li>
  );
}
