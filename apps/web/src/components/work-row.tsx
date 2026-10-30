import Link from "next/link";
import { setAssignmentStatus } from "@/app/(app)/classes/[classId]/assignments/actions";
import { deleteTask, setTaskStatus } from "@/app/(app)/tasks/actions";
import { StatusControl } from "@/components/status-control";
import { ActionButton } from "@/components/ui";
import type { WorkItem } from "@/lib/data/my-work";
import { formatDeadline, type DueState } from "@/lib/format";
import { DUE_STYLE, PRIORITY_LABEL } from "@/lib/labels";

/** Overdue and due-within-two-days work stands out; finished work fades. */
const ROW_STYLE: Record<DueState, string> = {
  overdue: "border-danger/40 bg-danger-soft",
  soon: "border-border border-s-4 border-s-danger",
  upcoming: "border-border",
  none: "border-border",
};

/** One assignment or personal task, with my status picker. Used on My work and the calendar. */
export function WorkRow({ item }: { item: WorkItem }) {
  const done = item.status === "done";
  const priority = PRIORITY_LABEL[item.priority];

  return (
    <li className={`rounded-xl border p-4 ${done ? "border-border bg-background/60" : ROW_STYLE[item.due.state]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-bold ${done ? "text-muted line-through" : ""}`}>{item.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${priority.className}`}>{priority.text}</span>
            {!done && item.due.state === "overdue" ? (
              <span className="rounded-full bg-danger px-2 py-0.5 text-xs text-primary-foreground">عقب‌افتاده</span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {item.kind === "assignment" ? (
              <Link href={`/classes/${item.classId}#assignment-${item.id}`} className="text-primary hover:underline">
                {item.courseName}
              </Link>
            ) : (
              <span className="text-muted">کار شخصی</span>
            )}
            {item.dueAt ? <span className="text-muted">مهلت: {formatDeadline(item.dueAt)}</span> : null}
            {done ? null : <span className={DUE_STYLE[item.due.state]}>{item.due.text}</span>}
          </div>
        </div>
        {item.kind === "task" ? (
          <div className="flex gap-2">
            <Link
              href={`/tasks/${item.id}/edit`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
            >
              ویرایش
            </Link>
            <ActionButton
              action={deleteTask.bind(null, item.id)}
              tone="danger"
              pendingText="…"
              confirmText={`کار «${item.title}» حذف شود؟`}
            >
              حذف
            </ActionButton>
          </div>
        ) : null}
      </div>

      {item.description && !done ? (
        <p className="mt-2 line-clamp-2 text-sm leading-7 whitespace-pre-line text-muted">{item.description}</p>
      ) : null}

      <div className="mt-3">
        <StatusControl
          status={item.status}
          action={item.kind === "task" ? setTaskStatus.bind(null, item.id) : setAssignmentStatus.bind(null, item.id)}
        />
      </div>
    </li>
  );
}
