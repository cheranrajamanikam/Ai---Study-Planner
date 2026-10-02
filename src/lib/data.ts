import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type StudyPlan = Database["public"]["Tables"]["study_plans"]["Row"];
export type SubjectInput = Database["public"]["Tables"]["subjects"]["Insert"];
export type TaskInput = Database["public"]["Tables"]["tasks"]["Insert"];

export const qk = {
  profile: ["profile"] as const,
  subjects: ["subjects"] as const,
  tasks: ["tasks"] as const,
  plan: ["latest-plan"] as const,
};

export async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You are signed out.");
  return data.user.id;
}

function check<T>(res: { data: T; error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () => {
      const uid = await currentUserId();
      return check(await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle());
    },
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: qk.subjects,
    queryFn: async () =>
      check(await supabase.from("subjects").select("*").order("exam_date", { ascending: true, nullsFirst: false })) ?? [],
  });
}

export function useTasks() {
  return useQuery({
    queryKey: qk.tasks,
    queryFn: async () =>
      check(
        await supabase
          .from("tasks")
          .select("*")
          .order("scheduled_date")
          .order("start_time"),
      ) ?? [],
  });
}

export function useLatestPlan() {
  return useQuery({
    queryKey: qk.plan,
    queryFn: async () =>
      check(
        await supabase
          .from("study_plans")
          .select("*")
          .eq("is_demo", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
}

export function useUpdateProfile() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (patch: Database["public"]["Tables"]["profiles"]["Update"]) => {
      const uid = await currentUserId();
      check(await supabase.from("profiles").update(patch).eq("user_id", uid));
    },
    onSuccess: () => invalidate(qk.profile),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveSubject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...values }: Omit<SubjectInput, "user_id"> & { id?: string }) => {
      const uid = await currentUserId();
      if (id) check(await supabase.from("subjects").update(values).eq("id", id));
      else check(await supabase.from("subjects").insert({ ...values, user_id: uid }));
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Subject updated" : "Subject added");
      return invalidate(qk.subjects);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSubject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("subjects").delete().eq("id", id)),
    onSuccess: () => {
      toast.success("Subject deleted");
      return invalidate(qk.subjects, qk.tasks);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...values }: Omit<TaskInput, "user_id"> & { id?: string }) => {
      const uid = await currentUserId();
      if (id) check(await supabase.from("tasks").update(values).eq("id", id));
      else check(await supabase.from("tasks").insert({ ...values, user_id: uid }));
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Task updated" : "Task created");
      return invalidate(qk.tasks);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("tasks").delete().eq("id", id)),
    onSuccess: () => {
      toast.success("Task deleted");
      return invalidate(qk.tasks);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Optimistic complete/uncomplete so dashboard stats update instantly. */
export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) =>
      check(
        await supabase
          .from("tasks")
          .update({ completed, completed_at: completed ? new Date().toISOString() : null })
          .eq("id", id),
      ),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const prev = qc.getQueryData<Task[]>(qk.tasks);
      qc.setQueryData<Task[]>(qk.tasks, (old) =>
        old?.map((t) =>
          t.id === id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t,
        ),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}
