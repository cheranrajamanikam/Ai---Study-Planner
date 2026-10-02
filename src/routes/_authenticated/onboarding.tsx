import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, qk, useProfile } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LevelSelect } from "@/components/SubjectDialog";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Get started — AI Study Planner" }] }),
  component: Onboarding,
});

type Row = { name: string; exam_date: string; preparation: number; weak: string; difficulty: string; priority: string };
const blank = (): Row => ({ name: "", exam_date: "", preparation: 20, weak: "", difficulty: "medium", priority: "medium" });

function Onboarding() {
  const { data: profile } = useProfile();
  const [name, setName] = useState("");
  const [level, setLevel] = useState("undergraduate");
  const [hours, setHours] = useState(3);
  const [time, setTime] = useState("morning");
  const [method, setMethod] = useState("pomodoro");
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Please enter your name.");
    const subs = rows.filter((r) => r.name.trim());
    if (subs.length === 0) return setErr("Add at least one subject.");
    setBusy(true);
    try {
      const uid = await currentUserId();
      const { error: pe } = await supabase
        .from("profiles")
        .update({ name: name.trim(), academic_level: level, daily_hours: hours, preferred_time: time, study_method: method, onboarded: true })
        .eq("user_id", uid);
      if (pe) throw pe;
      const { error: se } = await supabase.from("subjects").insert(
        subs.map((r) => ({
          user_id: uid,
          name: r.name.trim().slice(0, 80),
          exam_date: r.exam_date || null,
          preparation_percentage: r.preparation,
          difficulty: r.difficulty,
          priority: r.priority,
          weak_topics: r.weak.split(",").map((s) => s.trim()).filter(Boolean),
        })),
      );
      if (se) throw se;
      await qc.invalidateQueries({ queryKey: qk.profile });
      await qc.invalidateQueries({ queryKey: qk.subjects });
      toast.success("You're all set!");
      navigate({ to: "/plan" });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mesh min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Logo to="/dashboard" />
        <form onSubmit={submit} className="mt-8 space-y-6">
          <div className="panel space-y-4 p-6">
            <p className="eyebrow">Step 1 · About you</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="o-name">Name</Label>
                <Input id="o-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-level">Academic level</Label>
                <LevelSelect id="o-level" value={level} onChange={setLevel} options={["high school", "undergraduate", "postgraduate", "professional exam"]} />
              </div>
              <div className="space-y-2">
                <Label>Daily study hours: {hours} h</Label>
                <Slider value={[hours]} min={0.5} max={12} step={0.5} onValueChange={([v]) => setHours(v)} aria-label="Daily study hours" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-time">Preferred study time</Label>
                <LevelSelect id="o-time" value={time} onChange={setTime} options={["morning", "afternoon", "evening", "night"]} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="o-method">Preferred study method</Label>
                <LevelSelect id="o-method" value={method} onChange={setMethod} options={["pomodoro", "deep work blocks", "active recall", "spaced repetition", "practice problems"]} />
              </div>
            </div>
          </div>

          <div className="panel space-y-4 p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Step 2 · Your subjects</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, blank()])}>
                <Plus /> Add subject
              </Button>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid gap-3 rounded-xl bg-surface p-4 ring-1 ring-border sm:grid-cols-6">
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor={`n${i}`}>Subject</Label>
                  <Input id={`n${i}`} value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="e.g. Physics" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`d${i}`}>Exam date</Label>
                  <Input id={`d${i}`} type="date" value={r.exam_date} onChange={(e) => set(i, { exam_date: e.target.value })} />
                </div>
                <div className="flex items-end justify-end">
                  <Button type="button" variant="ghost" size="icon" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove subject">
                    <Trash2 />
                  </Button>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Difficulty</Label>
                  <LevelSelect value={r.difficulty} onChange={(v) => set(i, { difficulty: v })} options={["easy", "medium", "hard"]} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Priority</Label>
                  <LevelSelect value={r.priority} onChange={(v) => set(i, { priority: v })} options={["low", "medium", "high"]} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Prepared: {r.preparation}%</Label>
                  <Slider value={[r.preparation]} max={100} step={5} onValueChange={([v]) => set(i, { preparation: v })} aria-label="Preparation" />
                </div>
                <div className="space-y-1.5 sm:col-span-6">
                  <Label htmlFor={`w${i}`}>Weak topics (comma separated)</Label>
                  <Input id={`w${i}`} value={r.weak} onChange={(e) => set(i, { weak: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
          {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
          <Button type="submit" variant="ink" size="lg" disabled={busy}>{busy ? "Saving…" : "Continue to plan generator"}</Button>
        </form>
      </div>
    </div>
  );
}
