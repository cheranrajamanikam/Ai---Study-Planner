import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Panel, EmptyState } from "@/components/AppShell";
import { SubjectDialog } from "@/components/SubjectDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteSubject, useSubjects } from "@/lib/data";
import { daysUntil } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/_app/subjects")({
  head: () => ({ meta: [{ title: "Subjects — AI Study Planner" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { data: subjects = [], isLoading, error } = useSubjects();
  const del = useDeleteSubject();

  return (
    <Panel title="Subjects" meta={`${subjects.length} total`} action={<SubjectDialog trigger={<Button size="sm">+ Add subject</Button>} />}>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : error ? (
        <EmptyState title="Couldn't load subjects" body={error.message} />
      ) : subjects.length === 0 ? (
        <EmptyState title="No subjects yet" body="Add the subjects you're preparing for." action={<SubjectDialog trigger={<Button>Add your first subject</Button>} />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const d = daysUntil(s.exam_date);
            return (
              <article key={s.id} className="rounded-xl bg-surface p-4 ring-1 ring-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{s.name}</h3>
                    {s.is_demo && <span className="rounded bg-warm-soft px-1.5 py-0.5 text-[10px] font-medium">DEMO</span>}
                  </div>
                  <div className="flex shrink-0">
                    <SubjectDialog subject={s} trigger={<Button size="icon" variant="ghost" aria-label={`Edit ${s.name}`}><Pencil /></Button>} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label={`Delete ${s.name}`}><Trash2 /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                          <AlertDialogDescription>Tasks linked to this subject are kept but unlinked.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(s.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium capitalize">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{s.difficulty}</span>
                  <span className={`rounded-full px-2 py-0.5 ${s.priority === "high" ? "bg-rose/15 text-rose" : "bg-warm-soft"}`}>{s.priority} priority</span>
                  {d !== null && <span className="rounded-full bg-muted px-2 py-0.5">{d < 0 ? "exam passed" : `${d} days left`}</span>}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{s.exam_date ? `Exam · ${format(parseISO(s.exam_date), "EEE d MMM yyyy")}` : "No exam date"}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={s.preparation_percentage} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${s.preparation_percentage}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{s.preparation_percentage}% prepared</p>
                {s.weak_topics.length > 0 && (
                  <p className="mt-2 text-xs"><span className="text-muted-foreground">Weak:</span> {s.weak_topics.join(", ")}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
