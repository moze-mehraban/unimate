import "server-only";
import type { PersonalTask, Priority, TaskStatus } from "@unimate/shared";
import { requireUser } from "../auth";
import { describeDue, type DueState } from "../format";
import { createClient } from "../supabase/server";
import { sortWork } from "../work-filters";

type WorkItemBase = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  /** Relative deadline, computed at request time. */
  due: { text: string; state: DueState };
  priority: Priority;
  status: TaskStatus;
};

export type WorkItem =
  | (WorkItemBase & { kind: "assignment"; classId: string; courseName: string })
  | (WorkItemBase & { kind: "task" });

/** Assignments from all my classes (with my personal status) plus my personal tasks. */
export async function getMyWork(): Promise<WorkItem[]> {
  await requireUser();
  const supabase = await createClient();
  const [assignments, tasks] = await Promise.all([
    // security_invoker view: RLS limits it to classes I'm a member of.
    supabase.from("my_assignments").select("id, class_id, course_name, title, description, due_at, priority, status"),
    supabase.from("personal_tasks").select("id, title, description, due_at, priority, status"),
  ]);
  if (assignments.error) throw assignments.error;
  if (tasks.error) throw tasks.error;

  const now = Date.now();
  const items: WorkItem[] = [
    ...assignments.data.map((a) => ({
      kind: "assignment" as const,
      id: a.id,
      classId: a.class_id,
      courseName: a.course_name,
      title: a.title,
      description: a.description,
      dueAt: a.due_at,
      due: describeDue(a.due_at, now),
      priority: a.priority,
      // The view coalesces to 'todo'; the type just can't tell.
      status: a.status ?? "todo",
    })),
    ...tasks.data.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      description: t.description,
      dueAt: t.due_at,
      due: describeDue(t.due_at, now),
      priority: t.priority,
      status: t.status,
    })),
  ];
  return sortWork(items, "due");
}

export async function getPersonalTask(taskId: string): Promise<PersonalTask | null> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("personal_tasks").select("*").eq("id", taskId).maybeSingle();
  return data;
}
