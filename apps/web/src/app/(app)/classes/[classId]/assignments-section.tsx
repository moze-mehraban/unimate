import Link from "next/link";
import { AssignmentsRealtime } from "@/components/assignments-realtime";
import { StatusControl } from "@/components/status-control";
import { ActionButton, buttonStyles } from "@/components/ui";
import { getClassAssignments, type ClassAssignment } from "@/lib/data/assignments";
import type { ClassDetail } from "@/lib/data/classes";
import { formatDateTime, formatDeadline } from "@/lib/format";
import { DUE_STYLE, PRIORITY_LABEL } from "@/lib/labels";
import { deleteAssignment, reportAssignment, setAssignmentStatus } from "./assignments/actions";
import { ReportForm } from "./report-form";
import { CountBadge, Section } from "./section";

export async function AssignmentsSection({ cls }: { cls: ClassDetail }) {
  const assignments = await getClassAssignments(cls);

  return (
    <Section
      title="تکالیف"
      badge={
        <>
          {assignments.length ? <CountBadge count={assignments.length} /> : null}
          <AssignmentsRealtime classId={cls.id} assignmentIds={assignments.map((a) => a.id)} />
        </>
      }
      action={
        <Link href={`/classes/${cls.id}/assignments/new`} className={buttonStyles.primary}>
          + تکلیف جدید
        </Link>
      }
    >
      {assignments.length ? (
        <ul className="flex flex-col gap-3">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} classId={cls.id} assignment={a} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-background p-6 text-center text-sm text-muted">
          هنوز تکلیفی ثبت نشده. اولین تکلیف را تو اضافه کن تا همهٔ کلاس ببینند.
        </p>
      )}
    </Section>
  );
}

function AssignmentCard({ classId, assignment: a }: { classId: string; assignment: ClassAssignment }) {
  const due = a.due;
  const priority = PRIORITY_LABEL[a.priority];

  return (
    <li
      id={`assignment-${a.id}`}
      className={`rounded-xl border border-border p-4 ${a.myStatus === "done" ? "bg-background/60" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-bold ${a.myStatus === "done" ? "text-muted line-through" : ""}`}>{a.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${priority.className}`}>{priority.text}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {a.dueAt ? <span className="text-muted">مهلت: {formatDeadline(a.dueAt)}</span> : null}
            {a.myStatus === "done" ? null : <span className={DUE_STYLE[due.state]}>{due.text}</span>}
          </div>
        </div>
        {a.canEdit ? (
          <div className="flex gap-2">
            <Link
              href={`/classes/${classId}/assignments/${a.id}/edit`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
            >
              ویرایش
            </Link>
            <ActionButton
              action={deleteAssignment.bind(null, a.id)}
              tone="danger"
              pendingText="…"
              confirmText={`تکلیف «${a.title}» برای همهٔ اعضا حذف شود؟`}
            >
              حذف
            </ActionButton>
          </div>
        ) : null}
      </div>

      {a.description ? <p className="mt-3 text-sm leading-7 whitespace-pre-line">{a.description}</p> : null}

      <div className="mt-3">
        <StatusControl status={a.myStatus} action={setAssignmentStatus.bind(null, a.id)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
        <span>
          ثبت توسط {a.creatorName || "عضو سابق"} · {formatDateTime(a.createdAt)}
          {a.updatedAt !== a.createdAt ? " · ویرایش‌شده" : ""}
        </span>
        {a.reportedByMe ? (
          <span>گزارش تو در انتظار بررسی است</span>
        ) : !a.canEdit ? (
          <ReportForm action={reportAssignment.bind(null, a.id)} />
        ) : null}
      </div>
    </li>
  );
}
