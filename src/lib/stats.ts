import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import type { Subject, Task } from "./data";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export function daysUntil(date: string | null) {
  if (!date) return null;
  return differenceInCalendarDays(parseISO(date), new Date());
}

/** All statistics are derived from real task/subject rows — nothing hardcoded. */
export function computeStats(tasks: Task[], subjects: Subject[]) {
  const today = todayISO();
  const todayTasks = tasks.filter((t) => t.scheduled_date === today);
  const completedToday = todayTasks.filter((t) => t.completed);
  const completed = tasks.filter((t) => t.completed);
  const missed = tasks.filter((t) => !t.completed && t.scheduled_date < today);
  const upcoming = tasks.filter((t) => !t.completed && t.scheduled_date > today);

  const minutes = (list: Task[]) => list.reduce((s, t) => s + t.duration, 0);

  // Last 7 days of completed study
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const iso = format(d, "yyyy-MM-dd");
    const mins = minutes(completed.filter((t) => t.scheduled_date === iso));
    return { date: iso, label: format(d, "EEE"), hours: +(mins / 60).toFixed(1), isToday: iso === today };
  });

  // Streak: consecutive days (ending today, or yesterday if nothing yet today) with a completed task
  const doneDays = new Set(completed.map((t) => t.scheduled_date));
  let streak = 0;
  let cursor = doneDays.has(today) ? new Date() : subDays(new Date(), 1);
  while (doneDays.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }

  const bySubject = subjects.map((s) => {
    const st = tasks.filter((t) => t.subject_id === s.id);
    const done = st.filter((t) => t.completed);
    return {
      id: s.id,
      name: s.name,
      hours: +(minutes(done) / 60).toFixed(1),
      total: st.length,
      done: done.length,
      preparation: s.preparation_percentage,
    };
  });
  const mostStudied = [...bySubject].sort((a, b) => b.hours - a.hours)[0];

  const upcomingExams = subjects
    .filter((s) => s.exam_date && s.exam_date >= today)
    .sort((a, b) => (a.exam_date! < b.exam_date! ? -1 : 1));

  return {
    todayTasks,
    completedToday: completedToday.length,
    pendingToday: todayTasks.length - completedToday.length,
    todayHours: +(minutes(todayTasks) / 60).toFixed(1),
    todayDoneHours: +(minutes(completedToday) / 60).toFixed(1),
    todayPct: todayTasks.length ? Math.round((completedToday.length / todayTasks.length) * 100) : 0,
    total: tasks.length,
    completed: completed.length,
    pending: tasks.length - completed.length,
    pct: tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0,
    totalHours: +(minutes(completed) / 60).toFixed(1),
    weeklyHours: +week.reduce((s, d) => s + d.hours, 0).toFixed(1),
    week,
    streak,
    missed,
    upcoming,
    bySubject,
    mostStudied: mostStudied && mostStudied.hours > 0 ? mostStudied : null,
    upcomingExams,
  };
}

export const fmtTime = (t: string) => t.slice(0, 5);
export function endTime(start: string, duration: number) {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + duration;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
