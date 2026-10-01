import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Menu, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useTasks, useSubjects } from "@/lib/data";
import { computeStats } from "@/lib/stats";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/plan", label: "Study Plan" },
  { to: "/calendar", label: "Calendar" },
  { to: "/tasks", label: "Tasks" },
  { to: "/subjects", label: "Subjects" },
  { to: "/analytics", label: "Analytics" },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Main">
      <p className="px-3 pb-2 eyebrow">Workspace</p>
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-ink/[0.03]"
          activeProps={{ className: "bg-secondary font-medium text-secondary-foreground hover:bg-secondary" }}
        >
          {({ isActive }) => (
            <>
              <span className={`size-1.5 rounded-full ${isActive ? "bg-primary" : "bg-border"}`} />
              {n.label}
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}

function StreakCard() {
  const { data: tasks = [] } = useTasks();
  const { data: subjects = [] } = useSubjects();
  const { streak } = computeStats(tasks, subjects);
  return (
    <div className="rounded-xl bg-ink px-4 py-4 text-paper">
      <p className="text-[11px] uppercase tracking-[0.16em] text-paper/50">Focus streak</p>
      <p className="mt-1 font-display text-2xl font-semibold">
        {streak} {streak === 1 ? "day" : "days"}
      </p>
      <p className="mt-1 text-xs text-paper/60">
        {streak > 0 ? "Keep it going." : "Complete a session to start one."}
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const name = profile?.name || "Student";
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mesh min-h-screen">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/70 px-5 py-7 lg:flex">
          <Logo to="/dashboard" />
          <div className="mt-9">
            <NavLinks />
          </div>
          <div className="mt-auto space-y-3">
            <StreakCard />
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-ink/[0.03]"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="mesh w-72 px-5 py-7">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <Logo to="/dashboard" />
                  <div className="mt-8">
                    <NavLinks onNavigate={() => setOpen(false)} />
                  </div>
                  <div className="mt-8 space-y-3">
                    <StreakCard />
                    <button onClick={signOut} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
              <div>
                <p className="eyebrow">{format(new Date(), "EEEE, d MMMM")}</p>
                <h1 className="text-2xl font-semibold text-balance sm:text-3xl">
                  {greeting}, {name.split(" ")[0]}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ink" asChild className="hidden sm:inline-flex">
                <Link to="/plan">
                  <span className="size-1.5 rounded-full bg-warm" />
                  Generate AI Plan
                </Link>
              </Button>
              <div
                className="grid size-9 place-items-center rounded-full bg-warm-soft text-sm font-semibold"
                aria-label={`Signed in as ${name}`}
              >
                {initials}
              </div>
            </div>
          </header>
          <main className="px-5 pb-12 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function Panel({
  title,
  meta,
  children,
  className = "",
  action,
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`panel animate-rise p-5 ${className}`}>
      {(title || meta || action) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <div className="flex items-center gap-3">
            {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
            {action}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-surface px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
