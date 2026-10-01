import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useSaveSubject, type Subject } from "@/lib/data";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  difficulty: z.enum(["easy", "medium", "hard"]),
  priority: z.enum(["low", "medium", "high"]),
  preparation_percentage: z.number().int().min(0).max(100),
  exam_date: z.string().nullable(),
  weak_topics: z.array(z.string().trim().min(1).max(80)).max(20),
});

export function LevelSelect({ value, onChange, options, id }: { value: string; onChange: (v: string) => void; options: string[]; id?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="capitalize">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SubjectDialog({ subject, trigger }: { subject?: Subject; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => init(subject));
  const [error, setError] = useState<string | null>(null);
  const save = useSaveSubject();

  useEffect(() => {
    if (open) {
      setForm(init(subject));
      setError(null);
    }
  }, [open, subject]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      exam_date: form.exam_date || null,
      weak_topics: form.weak.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    save.mutate({ id: subject?.id, ...parsed.data }, { onSuccess: () => setOpen(false) });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{subject ? "Edit subject" : "Add subject"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Subject name</Label>
            <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-diff">Difficulty</Label>
              <LevelSelect id="s-diff" value={form.difficulty} onChange={(v) => setForm({ ...form, difficulty: v as never })} options={["easy", "medium", "hard"]} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-prio">Priority</Label>
              <LevelSelect id="s-prio" value={form.priority} onChange={(v) => setForm({ ...form, priority: v as never })} options={["low", "medium", "high"]} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Current preparation: {form.preparation_percentage}%</Label>
            <Slider value={[form.preparation_percentage]} max={100} step={5} onValueChange={([v]) => setForm({ ...form, preparation_percentage: v })} aria-label="Preparation percentage" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-exam">Exam date</Label>
            <Input id="s-exam" type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-weak">Weak topics (comma separated)</Label>
            <Input id="s-weak" value={form.weak} placeholder="e.g. Graphs, Recursion" onChange={(e) => setForm({ ...form, weak: e.target.value })} />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function init(s?: Subject) {
  return {
    name: s?.name ?? "",
    difficulty: (s?.difficulty ?? "medium") as "easy" | "medium" | "hard",
    priority: (s?.priority ?? "medium") as "low" | "medium" | "high",
    preparation_percentage: s?.preparation_percentage ?? 20,
    exam_date: s?.exam_date ?? "",
    weak: s?.weak_topics.join(", ") ?? "",
  };
}
