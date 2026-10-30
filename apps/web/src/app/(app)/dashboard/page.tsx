import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusControl } from "@/components/status-control";
import { ActionButton, buttonStyles } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getMyWork, type WorkItem } from "@/lib/data/my-work";
import { formatDeadline, formatNumber, type DueState } from "@/lib/format";
import { PRIORITY_LABEL } from "@/lib/labels";
import { setAssignmentStatus } from "../classes/[classId]/assignments/actions";
import { deleteTask, setTaskStatus } from "../tasks/actions";

export const metadata: Metadata = { title: "کارهای من" };

const FILTERS = [
  { value: "active", label: "باقی‌مانده" },
  { value: "done", label: "تکمیل‌شده" },
  { value: "all", label: "همه" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

const DUE_STYLE: Record<DueState, string> = {
  overdue: "text-danger",
  soon: "text-danger font-medium",
  upcoming: "text-muted",
  none: "text-muted",
};

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className="h-14 w-64 animate-pulse rounded-lg bg-surface" />}>
        <Greeting />
      </Suspense>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <MyWork searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Greeting() {
  const user = await requireUser();
  const firstName = user.profile.full_name.split(" ")[0];

  return (
    <div>
      <h1 className="text-2xl font-bold">سلام{firstName ? ` ${firstName}` : ""} 👋</h1>
      {!user.profile.university ? (
        <p className="mt-1 text-sm text-muted">
          هنوز دانشگاهت را ثبت نکرده‌ای.{" "}
          <Link href="/profile" className="text-primary hover:underline">
            تکمیل پروفایل
          </Link>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">{user.profile.university}</p>
      )}
    </div>
  );
}

async function MyWork({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { show } = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.value === show) ? (show as Filter) : "active";
  const items = await getMyWork();

  const remaining = items.filter((i) => i.status !== "done");
  const counts = {
    remaining: remaining.length,
    overdue: remaining.filter((i) => i.due.state === "overdue").length,
    inProgress: remaining.filter((i) => i.status === "in_progress").length,
    done: items.length - remaining.length,
  };
  const visible = filter === "all" ? items : filter === "done" ? items.filter((i) => i.status === "done") : remaining;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="باقی‌مانده" value={counts.remaining} />
        <Stat label="عقب‌افتاده" value={counts.overdue} tone={counts.overdue ? "danger" : undefined} />
        <Stat label="در حال انجام" value={counts.inProgress} />
        <Stat label="تکمیل‌شده" value={counts.done} />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-bold">کارهای من</h2>
          <nav className="flex rounded-lg bg-background p-0.5 text-sm" aria-label="فیلتر">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value === "active" ? "/dashboard" : `/dashboard?show=${f.value}`}
                aria-current={filter === f.value ? "page" : undefined}
                className={`rounded-md px-3 py-1 ${
                  filter === f.value ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
          <Link href="/tasks/new" className={`ms-auto ${buttonStyles.primary}`}>
            + کار شخصی
          </Link>
        </div>

        {visible.length ? (
          <ul className="flex flex-col gap-2">
            {visible.map((item) => (
              <WorkRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </ul>
        ) : (
          <EmptyState filter={filter} hasAny={items.length > 0} />
        )}
      </section>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className={`text-2xl font-bold ${tone === "danger" ? "text-danger" : ""}`}>{formatNumber(value)}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

function WorkRow({ item }: { item: WorkItem }) {
  const done = item.status === "done";
  const priority = PRIORITY_LABEL[item.priority];

  return (
    <li className={`rounded-xl border border-border p-4 ${done ? "bg-background/60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-bold ${done ? "text-muted line-through" : ""}`}>{item.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${priority.className}`}>{priority.text}</span>
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

function EmptyState({ filter, hasAny }: { filter: Filter; hasAny: boolean }) {
  if (!hasAny) {
    return (
      <div className="rounded-xl bg-background p-8 text-center text-sm text-muted">
        <p>هنوز کاری نداری.</p>
        <p className="mt-1">
          به یک{" "}
          <Link href="/classes" className="text-primary hover:underline">
            کلاس
          </Link>{" "}
          بپیوند تا تکالیفش اینجا بیاید، یا یک کار شخصی اضافه کن.
        </p>
      </div>
    );
  }
  return (
    <p className="rounded-xl bg-background p-8 text-center text-sm text-muted">
      {filter === "done" ? "هنوز چیزی را تکمیل نکرده‌ای." : "همه‌چیز انجام شده! 🎉"}
    </p>
  );
}
