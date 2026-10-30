import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonStyles } from "@/components/ui";
import { WorkFilterBar } from "@/components/work-filter-bar";
import { WorkRow } from "@/components/work-row";
import { requireUser } from "@/lib/auth";
import { getMyWork } from "@/lib/data/my-work";
import { formatNumber } from "@/lib/format";
import { filterWork, parseWorkFilters, sortWork, workSources } from "@/lib/work-filters";

export const metadata: Metadata = { title: "کارهای من" };

const TABS = [
  { value: "active", label: "باقی‌مانده" },
  { value: "done", label: "تکمیل‌شده" },
  { value: "all", label: "همه" },
] as const;
type Tab = (typeof TABS)[number]["value"];

type SearchParams = Record<string, string | string[] | undefined>;

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

/** Current query as plain strings, so links and the filter bar can keep it. */
function plainParams(params: SearchParams) {
  return Object.fromEntries(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"));
}

async function MyWork({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const tab: Tab = TABS.some((t) => t.value === params.show) ? (params.show as Tab) : "active";
  const filters = parseWorkFilters(params);
  const all = await getMyWork();
  const items = sortWork(filterWork(all, filters), filters.sort);

  const remaining = items.filter((i) => i.status !== "done");
  const counts = {
    remaining: remaining.length,
    overdue: remaining.filter((i) => i.due.state === "overdue").length,
    inProgress: remaining.filter((i) => i.status === "in_progress").length,
    done: items.length - remaining.length,
  };
  const visible = tab === "all" ? items : tab === "done" ? items.filter((i) => i.status === "done") : remaining;
  const query = plainParams(params);
  const isFiltered = filters.source !== "all" || filters.priority !== "all";

  function tabHref(value: Tab) {
    const next = new URLSearchParams(query);
    if (value === "active") next.delete("show");
    else next.set("show", value);
    const qs = next.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

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
          <nav className="flex rounded-lg bg-background p-0.5 text-sm" aria-label="وضعیت">
            {TABS.map((t) => (
              <Link
                key={t.value}
                href={tabHref(t.value)}
                aria-current={tab === t.value ? "page" : undefined}
                className={`rounded-md px-3 py-1 ${
                  tab === t.value ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <Link href="/tasks/new" className={`ms-auto ${buttonStyles.primary}`}>
            + کار شخصی
          </Link>
        </div>

        <div className="mb-4">
          <WorkFilterBar filters={filters} sources={workSources(all)} params={query} showSort />
        </div>

        {visible.length ? (
          <ul className="flex flex-col gap-2">
            {visible.map((item) => (
              <WorkRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </ul>
        ) : (
          <EmptyState tab={tab} hasAny={all.length > 0} isFiltered={isFiltered} />
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

function EmptyState({ tab, hasAny, isFiltered }: { tab: Tab; hasAny: boolean; isFiltered: boolean }) {
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
      {isFiltered
        ? "با این فیلترها چیزی پیدا نشد."
        : tab === "done"
          ? "هنوز چیزی را تکمیل نکرده‌ای."
          : "همه‌چیز انجام شده! 🎉"}
    </p>
  );
}
