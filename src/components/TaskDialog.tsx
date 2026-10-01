import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useSaveTask, useSubjects, type Task } from "@/lib/data";
import { todayISO } from "@/lib/stats";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().max(1000).nullable(),
  subject_id: z.string().uuid().nullable(),
  task_type: z.enum(["study", "revision", "practice", "mock_test"]),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Pick a time"),
  duration: z.number().int().min(5, "At least 5 minutes").max(600),
});

export function TaskDialog({ task, trigger }: { task?: Task; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: subjects = [] } = useSubjects();
  const save = useSaveTask();
  const [form, setForm] = useState(() => init(task));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(init(task));
      setError(null);
    }
  }, [open, task]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      description: form.description || null,
      subject_id: form.subject_id === "none" ? null : form.subject_id,
      duration: Number(form.duration),
    });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    save.mutate({ id: task?.id, ...parsed.data }, { onSuccess: () => setOpen(false) });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-subj">Subject</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger id="t-subj"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-type">Type</Label>
              <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v as never })}>
                <SelectTrigger id="t-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="study">Study</SelectItem>
                  <SelectItem value="revision">Revision</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="mock_test">Mock test</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-date">Date</Label>
              <Input id="t-date" type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-time">Start</Label>
              <Input id="t-time" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-dur">Minutes</Label>
              <Input id="t-dur" type="number" min={5} max={600} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Notes</Label>
            <Textarea id="t-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function init(t?: Task) {
  return {
    title: t?.title ?? "",
    description: t?.description ?? "",
    subject_id: t?.subject_id ?? "none",
    task_type: (t?.task_type ?? "study") as "study" | "revision" | "practice" | "mock_test",
    scheduled_date: t?.scheduled_date ?? todayISO(),
    start_time: t?.start_time.slice(0, 5) ?? "09:00",
    duration: String(t?.duration ?? 60),
  };
}
