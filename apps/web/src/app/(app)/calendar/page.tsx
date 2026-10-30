import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ChevronBackIcon, ChevronForwardIcon } from "@/components/icons";
import { WorkFilterBar } from "@/components/work-filter-bar";
import { WorkRow } from "@/components/work-row";
import {
  addDays,
  dayKeyOf,
  formatDayMonth,
  formatDayNumber,
  formatDayTitle,
  formatTime,
  isDayKey,
  jalaliMonth,
  todayKey,
  WEEKDAY_NAMES,
  weekDays,
  type DayKey,
} from "@/lib/calendar";
import { getMyWork, type WorkItem } from "@/lib/data/my-work";
import { formatNumber } from "@/lib/format";
import { PRIORITY_LABEL } from "@/lib/labels";
import { filterWork, parseWorkFilters, workSources } from "@/lib/work-filters";

export const metadata: Metadata = { title: "تقویم" };

type SearchParams = Record<string, string | string[] | undefined>;
type View = "month" | "week";

/** How many items a month cell lists before "+n". */
const CELL_LIMIT = 3;

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">تقویم</h1>
      <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-2xl bg-surface" />}>
        <CalendarView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CalendarView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const view: View = params.view === "week" ? "week" : "month";
  const filters = parseWorkFilters(params);
  const all = await getMyWork();
  // Read the clock only after request-time data (the session), or prerendering fails.
  const today = todayKey();
  const anchor = isDayKey(params.d) ? params.d : today;
  const items = filterWork(all, filters);

  const byDay = new Map<DayKey, WorkItem[]>();
  for (const item of items) {
    if (!item.dueAt) continue;
    const key = dayKeyOf(item.dueAt);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  const undated = items.filter((i) => !i.dueAt && i.status !== "done").length;

  const query = Object.fromEntries(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  const href = (overrides: Record<string, string | null>) => {
    const next = new URLSearchParams(query);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `/calendar?${qs}` : "/calendar";
  };

  const month = jalaliMonth(anchor);
  const week = weekDays(anchor);
  const [prev, next, title] =
    view === "month"
      ? [addDays(month.first, -1), addDays(month.last, 1), month.title]
      : [addDays(anchor, -7), addDays(anchor, 7), `${formatDayMonth(week[0])} تا ${formatDayMonth(week[6])}`];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <NavButton href={href({ d: prev })} label={view === "month" ? "ماه قبل" : "هفتهٔ قبل"}>
            <ChevronBackIcon />
          </NavButton>
          <NavButton href={href({ d: next })} label={view === "month" ? "ماه بعد" : "هفتهٔ بعد"}>
            <ChevronForwardIcon />
          </NavButton>
        </div>
        <h2 className="text-lg font-bold">{title}</h2>
        <Link href={href({ d: null })} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-background">
          امروز
        </Link>
        <nav className="ms-auto flex rounded-lg bg-background p-0.5 text-sm" aria-label="نما">
          {(["month", "week"] as const).map((v) => (
            <Link
              key={v}
              href={href({ view: v === "month" ? null : v })}
              aria-current={view === v ? "page" : undefined}
              className={`rounded-md px-3 py-1 ${view === v ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {v === "month" ? "ماهانه" : "هفتگی"}
            </Link>
          ))}
        </nav>
      </div>

      <WorkFilterBar filters={filters} sources={workSources(all)} params={query} />

      {view === "month" ? (
        <>
          <MonthGrid
            weeks={month.weeks}
            monthFirst={month.first}
            monthLast={month.last}
            today={today}
            selected={anchor}
            byDay={byDay}
            dayHref={(d) => href({ d })}
          />
          <DayAgenda day={anchor} today={today} items={byDay.get(anchor) ?? []} />
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {week.map((day) => (
            <DayAgenda key={day} day={day} today={today} items={byDay.get(day) ?? []} />
          ))}
        </div>
      )}

      {undated ? (
        <p className="text-xs text-muted">
          {formatNumber(undated)} کار بدون مهلت در تقویم نیست —{" "}
          <Link href="/dashboard" className="text-primary hover:underline">
            کارهای من
          </Link>
        </p>
      ) : null}
    </section>
  );
}

function NavButton({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      scroll={false}
      className="grid size-8 place-items-center rounded-lg border border-border hover:bg-background"
    >
      {children}
    </Link>
  );
}

function MonthGrid({
  weeks,
  monthFirst,
  monthLast,
  today,
  selected,
  byDay,
  dayHref,
}: {
  weeks: DayKey[][];
  monthFirst: DayKey;
  monthLast: DayKey;
  today: DayKey;
  selected: DayKey;
  byDay: Map<DayKey, WorkItem[]>;
  dayHref: (day: DayKey) => string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 bg-background text-center text-xs text-muted">
        {WEEKDAY_NAMES.map((name) => (
          <div key={name} className="py-2">
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{name.charAt(0)}</span>
          </div>
        ))}
      </div>
      {weeks.map((days) => (
        <div key={days[0]} className="grid grid-cols-7 border-t border-border">
          {days.map((day) => {
            const inMonth = day >= monthFirst && day <= monthLast;
            const dayItems = byDay.get(day) ?? [];
            const open = dayItems.filter((i) => i.status !== "done");
            const hasOverdue = open.some((i) => i.due.state === "overdue");
            return (
              <Link
                key={day}
                href={dayHref(day)}
                scroll={false}
                aria-current={day === selected ? "date" : undefined}
                aria-label={`${formatDayTitle(day)}${dayItems.length ? ` — ${formatNumber(dayItems.length)} کار` : ""}`}
                className={`flex min-h-16 flex-col gap-1 border-s border-border p-1 first:border-s-0 sm:min-h-24 sm:p-1.5 ${
                  day === selected ? "bg-primary/5 ring-2 ring-primary ring-inset" : "hover:bg-background"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={`grid size-6 place-items-center self-start rounded-full text-xs ${
                    day === today ? "bg-primary font-bold text-primary-foreground" : ""
                  }`}
                >
                  {formatDayNumber(day)}
                </span>

                {/* Phones: one dot per day, red if anything is overdue. */}
                {dayItems.length ? (
                  <span
                    className={`mx-auto size-1.5 rounded-full sm:hidden ${
                      hasOverdue ? "bg-danger" : open.length ? "bg-primary" : "bg-border"
                    }`}
                  />
                ) : null}

                <ul className="hidden flex-col gap-0.5 sm:flex">
                  {dayItems.slice(0, CELL_LIMIT).map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <Chip item={item} />
                    </li>
                  ))}
                  {dayItems.length > CELL_LIMIT ? (
                    <li className="px-1 text-[11px] text-muted">+{formatNumber(dayItems.length - CELL_LIMIT)} مورد دیگر</li>
                  ) : null}
                </ul>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Chip({ item }: { item: WorkItem }) {
  const style =
    item.status === "done"
      ? "bg-background text-muted line-through"
      : item.due.state === "overdue"
        ? "bg-danger text-primary-foreground"
        : PRIORITY_LABEL[item.priority].className;
  return (
    <span
      title={`${item.dueAt ? formatTime(item.dueAt) : ""} ${item.title}`}
      className={`block truncate rounded px-1 py-0.5 text-[11px] leading-4 ${style}`}
    >
      {item.title}
    </span>
  );
}

function DayAgenda({ day, today, items }: { day: DayKey; today: DayKey; items: WorkItem[] }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
        {formatDayTitle(day)}
        {day === today ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">امروز</span> : null}
        {items.length ? <span className="text-xs font-normal text-muted">{formatNumber(items.length)} کار</span> : null}
      </h3>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <WorkRow key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-background px-4 py-3 text-sm text-muted">مهلتی برای این روز ثبت نشده.</p>
      )}
    </div>
  );
}
