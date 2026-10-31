import { describeDue, type DueState, type Priority, type TaskStatus } from "@unimate/shared";
import { supabase } from "./supabase";

// Same shape and ordering as the web dashboard (apps/web/src/lib/data/my-work.ts).

type WorkItemBase = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  due: { text: string; state: DueState };
  priority: Priority;
  status: TaskStatus;
};

export type WorkItem =
  | (WorkItemBase & { kind: "assignment"; classId: string; courseName: string })
  | (WorkItemBase & { kind: "task" });

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Nearest deadline first, undated last; ties broken by priority. */
function compareWork(a: WorkItem, b: WorkItem) {
  if (a.dueAt !== b.dueAt) {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt < b.dueAt ? -1 : 1;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

/** Assignments from all my classes (with my personal status) plus my personal tasks. RLS scopes both. */
export async function fetchMyWork(): Promise<WorkItem[]> {
  const [assignments, tasks] = await Promise.all([
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
      status: a.status ?? ("todo" as const),
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
  return items.sort(compareWork);
}

/** My status on a class assignment (only I can see it) or on a personal task. */
export async function setWorkStatus(item: WorkItem, status: TaskStatus, userId: string) {
  const { error } =
    item.kind === "task"
      ? await supabase.from("personal_tasks").update({ status }).eq("id", item.id)
      : await supabase
          .from("assignment_status")
          .upsert({ assignment_id: item.id, user_id: userId, status }, { onConflict: "assignment_id,user_id" });
  if (error) throw error;
}
