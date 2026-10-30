// Jalali month/week grids built on Intl's Persian calendar.
//
// Days are "YYYY-MM-DD" keys of the Gregorian date in Tehran. Arithmetic runs on
// UTC noon of the key, so it never crosses a day boundary; the Jalali parts of
// that instant (read in UTC) are the Jalali date of the Tehran day.
import { toTehranInputValue } from "./format";

export type DayKey = string;

const DAY_MS = 86_400_000;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const partsFmt = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const monthNameFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "UTC", month: "long" });
const dayNumberFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "UTC", day: "numeric" });
const dayMonthFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "UTC", month: "long", day: "numeric" });
const dayTitleFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });

/** Saturday-first, as on Iranian calendars. */
export const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function noon(key: DayKey) {
  return new Date(`${key}T12:00:00Z`);
}

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string" || !DAY_KEY_RE.test(value)) return false;
  const date = noon(value);
  // Rejects overflowing dates like 2026-02-31.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Tehran day of an instant. */
export function dayKeyOf(value: string | Date): DayKey {
  return toTehranInputValue(new Date(value).toISOString()).slice(0, 10);
}

export function todayKey(): DayKey {
  return dayKeyOf(new Date());
}

export function addDays(key: DayKey, days: number): DayKey {
  return new Date(noon(key).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function jalaliParts(key: DayKey) {
  const parts = Object.fromEntries(partsFmt.formatToParts(noon(key)).map((p) => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

/** 0 = Saturday … 6 = Friday. */
export function weekdayIndex(key: DayKey) {
  return (noon(key).getUTCDay() + 1) % 7;
}

export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -weekdayIndex(key));
}

export function weekDays(key: DayKey): DayKey[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The Jalali month containing `key`: its days and a Saturday-first grid of whole weeks. */
export function jalaliMonth(key: DayKey) {
  const { year, month, day } = jalaliParts(key);
  const first = addDays(key, 1 - day);
  let last = first;
  while (jalaliParts(addDays(last, 1)).month === month) last = addDays(last, 1);

  const weeks: DayKey[][] = [];
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return { year, month, first, last, weeks, title: `${monthNameFmt.format(noon(key))} ${formatJalaliYear(year)}` };
}

function formatJalaliYear(year: number) {
  return year.toLocaleString("fa-IR", { useGrouping: false });
}

export function formatDayNumber(key: DayKey) {
  return dayNumberFmt.format(noon(key));
}

/** e.g. "۱۰ آبان" */
export function formatDayMonth(key: DayKey) {
  return dayMonthFmt.format(noon(key));
}

/** e.g. "شنبه ۱۰ آبان" */
export function formatDayTitle(key: DayKey) {
  return dayTitleFmt.format(noon(key));
}

/** e.g. "۲۳:۵۹" in Tehran time. */
export function formatTime(value: string | Date) {
  return timeFmt.format(new Date(value));
}
