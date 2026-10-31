import Link from "next/link";
import { ActionButton } from "@/components/ui";
import { getOpenReports } from "@/lib/data/assignments";
import { formatDateTime } from "@/lib/format";
import { resolveReport } from "./assignments/actions";
import { CountBadge, Section } from "./section";

/** Owner only. Hidden entirely when there is nothing to review. */
export async function ReportsSection({ classId }: { classId: string }) {
  const reports = await getOpenReports(classId);
  if (!reports.length) return null;

  return (
    <Section
      id="reports"
      title="گزارش‌های تکالیف"
      badge={<CountBadge count={reports.length} />}
      description="اعضا این تکالیف را نادرست گزارش کرده‌اند. در صورت نیاز تکلیف را اصلاح کن و گزارش را ببند."
    >
      <ul className="flex flex-col gap-3">
        {reports.map((r) => (
          <li key={r.id} className="rounded-xl border border-danger/30 bg-danger-soft/40 p-4">
            <div className="text-sm">
              <span className="text-muted">تکلیف: </span>
              <a href={`#assignment-${r.assignmentId}`} className="font-medium hover:underline">
                {r.assignmentTitle}
              </a>
            </div>
            <p className="mt-2 text-sm leading-7 whitespace-pre-line">{r.reason}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">
                {r.reporterName || "عضو سابق"} · {formatDateTime(r.createdAt)}
              </span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/classes/${classId}/assignments/${r.assignmentId}/edit`}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-background"
                >
                  اصلاح تکلیف
                </Link>
                <ActionButton action={resolveReport.bind(null, r.id, "resolved")} tone="primary" pendingText="…">
                  رسیدگی شد
                </ActionButton>
                <ActionButton action={resolveReport.bind(null, r.id, "dismissed")} pendingText="…">
                  رد گزارش
                </ActionButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
