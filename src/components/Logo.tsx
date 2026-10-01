import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 px-2" aria-label="AI Study Planner home">
      <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <span className="font-display text-lg font-semibold">S</span>
      </div>
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold">Study Planner</p>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">AI · planner</p>
      </div>
    </Link>
  );
}
