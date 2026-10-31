// Persian (Jalali) dates and digits. fa-IR uses the Persian calendar by default.
// Pin the zone so server-rendered times don't depend on where the server runs.
export const APP_TIME_ZONE = "Asia/Tehran";

const dateFmt = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: APP_TIME_ZONE,
});
const dateTimeFmt = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});
const shortDateTimeFmt = new Intl.DateTimeFormat("fa-IR", {
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

export function formatDate(value: string | Date) {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return dateTimeFmt.format(new Date(value));
}

/** e.g. "شنبه ۱۵ آبان، ساعت ۲۳:۵۹" — for deadlines, where the weekday matters. */
export function formatDeadline(value: string | Date) {
  return shortDateTimeFmt.format(new Date(value));
}

// Iran dropped DST in 2022, so Tehran time is a fixed offset.
const TEHRAN_OFFSET = "+03:30";
const TEHRAN_OFFSET_MS = 3.5 * 3_600_000;

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in Tehran time, for <input type="datetime-local">. */
export function toTehranInputValue(iso: string | null): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + TEHRAN_OFFSET_MS).toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" entered as Tehran time → Date (invalid Date if malformed). */
export function fromTehranInputValue(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00${TEHRAN_OFFSET}` : "invalid");
}

export function formatNumber(value: number) {
  return value.toLocaleString("fa-IR");
}

export type DueState = "overdue" | "soon" | "upcoming" | "none";

/** Relative deadline text and urgency, e.g. "۳ روز مانده" or "۲ ساعت گذشته". */
export function describeDue(dueAt: string | null, now = Date.now()): { text: string; state: DueState } {
  if (!dueAt) return { text: "بدون مهلت", state: "none" };
  const diff = new Date(dueAt).getTime() - now;
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);
  const amount =
    days >= 1 ? `${formatNumber(days)} روز` : hours >= 1 ? `${formatNumber(hours)} ساعت` : `${formatNumber(Math.max(1, Math.floor(abs / 60_000)))} دقیقه`;

  if (diff < 0) return { text: `${amount} گذشته`, state: "overdue" };
  return { text: `${amount} مانده`, state: diff < 2 * 86_400_000 ? "soon" : "upcoming" };
}

/** Past time as "همین الان" / "۵ دقیقه پیش" / "۳ روز پیش", or the date after a week. */
export function formatTimeAgo(value: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(value).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${formatNumber(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${formatNumber(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${formatNumber(days)} روز پیش`;
  return formatDate(value);
}
