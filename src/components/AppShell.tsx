import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [{ to: "/dashboard", label: "Dashboard" }] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="mesh min-h-screen">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/70 px-5 py-7 lg:flex">
          <p className="px-2 font-display text-lg font-semibold">Building Ops Agent</p>
          <nav className="mt-9 space-y-1" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-ink/[0.03]"
                activeProps={{ className: "bg-secondary font-medium text-secondary-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={signOut}
            className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-ink/[0.03]"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel p-5 ${className}`}>
      {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
