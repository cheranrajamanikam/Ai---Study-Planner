import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Subject, Task } from "@/lib/data";
import { todayISO } from "@/lib/stats";

export function MiniCalendar({ exams, tasks }: { exams: Subject[]; tasks: Task[] }) {
  const [month, setMonth] = useState(new Date());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const examDates = new Map(exams.filter((e) => e.exam_date).map((e) => [e.exam_date!, e.name]));
  const taskDates = new Set(tasks.map((t) => t.scheduled_date));
  const today = todayISO();
  const next = exams.find((e) => e.exam_date && e.exam_date >= today);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{format(month, "MMMM")}</h2>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))} className="rounded p-1 hover:bg-muted"><ChevronLeft className="size-3.5" /></button>
          {format(month, "yyyy")}
          <button aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} className="rounded p-1 hover:bg-muted"><ChevronRight className="size-3.5" /></button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const exam = examDates.get(iso);
          const cls = iso === today
            ? "bg-ink font-medium text-paper"
            : exam
              ? "bg-warm-soft font-medium text-warm"
              : !isSameMonth(d, month)
                ? "text-muted-foreground/40"
                : "";
          return (
            <span key={iso} title={exam ? `Exam: ${exam}` : undefined} className={`relative mx-auto grid size-7 place-items-center rounded-full ${cls}`}>
              {format(d, "d")}
              {taskDates.has(iso) && iso !== today && !exam && <span className="absolute bottom-0.5 size-1 rounded-full bg-primary/60" />}
            </span>
          );
        })}
      </div>
      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
        {next ? `Exam: ${next.name} · ${format(new Date(next.exam_date! + "T00:00"), "EEE d MMM")}` : "No upcoming exams"}
      </p>
    </div>
  );
}
