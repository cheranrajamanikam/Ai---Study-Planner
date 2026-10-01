export function WeeklyChart({ week }: { week: { label: string; hours: number; isToday: boolean }[] }) {
  const max = Math.max(1, ...week.map((d) => d.hours));
  return (
    <div className="flex h-40 items-end gap-2.5" role="img" aria-label="Study hours for the last 7 days">
      {week.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end" title={`${d.hours} h`}>
            <div
              className={`w-full rounded-t-md transition-all ${d.isToday ? "bg-warm" : "bg-primary/80"}`}
              style={{ height: `${Math.max(3, (d.hours / max) * 100)}%` }}
            />
          </div>
          <span className={`text-[11px] ${d.isToday ? "font-medium text-warm" : "text-muted-foreground"}`}>{d.label[0]}</span>
        </div>
      ))}
    </div>
  );
}
