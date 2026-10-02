import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Study Planner — Personalised study schedules" },
      { name: "description", content: "Turn your subjects, exam dates and weak topics into a calm, realistic AI-built study schedule." },
      { property: "og:title", content: "AI Study Planner — Personalised study schedules" },
      { property: "og:description", content: "Turn your subjects, exam dates and weak topics into a calm, realistic AI-built study schedule." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  ["AI-built schedules", "Daily sessions balanced across exam dates, difficulty and weak topics."],
  ["Adjust when life happens", "Missed a few sessions? Re-plan the remaining days in one click."],
  ["Progress you can see", "Streaks, weekly hours and subject-by-subject progress — all from real data."],
];
const STEPS = [
  ["Add your subjects", "Exam dates, preparation level, difficulty and weak topics."],
  ["Set your availability", "Hours per day, preferred time and the days you can study."],
  ["Generate & follow", "Tick off sessions; your dashboard and analytics update instantly."],
];

function Landing() {
  return (
    <div className="mesh min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Log in</Link></Button>
          <Button variant="ink" asChild><Link to="/auth" search={{ mode: "signup" }}>Sign up</Link></Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-12 pb-20 lg:grid-cols-2">
        <div className="animate-rise">
          <p className="eyebrow">AI Study Planner</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] text-balance md:text-6xl">
            A calm, doable plan for every exam.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground text-pretty">
            Tell us your subjects, exam dates and how much time you have. The AI builds a day-by-day schedule that
            focuses on what matters most.
          </p>
          <Button variant="warm" size="lg" className="mt-8 rounded-lg" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Create My Study Plan</Link>
          </Button>
        </div>
        <div className="rounded-2xl bg-ink p-6 text-paper animate-rise">
          <p className="text-[11px] uppercase tracking-[0.18em] text-paper/50">Today's sessions</p>
          <ul className="mt-4 space-y-2">
            {[
              ["09:00 – 10:00", "Data Structures — Arrays", true],
              ["10:15 – 11:15", "Operating Systems — Processes", true],
              ["14:00 – 15:00", "Mathematics — Probability", false],
              ["19:00 – 19:30", "Revision", false],
            ].map(([t, s, d]) => (
              <li key={s as string} className="flex items-center gap-3 rounded-lg bg-paper/10 px-3 py-2.5">
                <span className={`size-4 rounded ${d ? "bg-warm" : "ring-1 ring-paper/40"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{s}</p>
                  <p className="text-xs text-paper/60">{t}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">Features</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FEATURES.map(([t, b]) => (
            <div key={t} className="panel p-6">
              <h3 className="text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">How it works</p>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="border-t border-ink/20 pt-4">
              <span className="font-display text-3xl text-primary">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-2xl bg-secondary p-8 md:p-12">
          <p className="eyebrow">Benefits</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold text-balance">Less planning, more studying — and no last-minute panic.</h2>
          <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <li>• Weak topics get extra time automatically</li>
            <li>• Revision and mock tests before every exam</li>
            <li>• Realistic daily limits that respect your hours</li>
            <li>• Your data is private to your account</li>
          </ul>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t px-6 py-8 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} AI Study Planner</span>
        <Link to="/auth" className="hover:text-foreground">Get started</Link>
      </footer>
    </div>
  );
}
