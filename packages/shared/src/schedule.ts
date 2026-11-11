import type { Database } from "./database.types";
import { toFaDigits, WEEKDAY_NAMES, weekdayIndex, type DayKey } from "./jalali";

// Class colors and weekly sessions, shared by the web and mobile apps.

/** Same keys as the `classes.color` check constraint. */
export const CLASS_COLORS = {
  indigo: { hex: "#6366f1", label: "نیلی" },
  rose: { hex: "#f43f5e", label: "سرخ‌آبی" },
  emerald: { hex: "#10b981", label: "زمردی" },
  amber: { hex: "#f59e0b", label: "کهربایی" },
  sky: { hex: "#0ea5e9", label: "آسمانی" },
  violet: { hex: "#8b5cf6", label: "بنفش" },
  teal: { hex: "#14b8a6", label: "سبزآبی" },
  orange: { hex: "#f97316", label: "نارنجی" },
  pink: { hex: "#ec4899", label: "صورتی" },
  lime: { hex: "#84cc16", label: "لیمویی" },
} as const;

export type ClassColor = keyof typeof CLASS_COLORS;
export const CLASS_COLOR_KEYS = Object.keys(CLASS_COLORS) as ClassColor[];

/** Hex for a stored color key (falls back to indigo for anything unexpected). */
export function classColorHex(color: string | null | undefined): string {
  return (CLASS_COLORS as Record<string, { hex: string }>)[color ?? ""]?.hex ?? CLASS_COLORS.indigo.hex;
}

export type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"];

/** "10:00:00" → "۱۰:۰۰" */
export function formatClockFa(time: string): string {
  return toFaDigits(time.slice(0, 5));
}

/** "203" → "اتاق ۲۰۳"; a named room ("آزمایشگاه شبکه") is shown as is. */
export function formatRoom(room: string): string {
  return /^\d/.test(room) ? `اتاق ${toFaDigits(room)}` : room;
}

/** "شنبه ۱۰:۰۰ تا ۱۱:۳۰ · اتاق ۲۰۳" */
export function describeSession(s: Pick<ClassSession, "weekday" | "start_time" | "end_time" | "room">, withDay = true): string {
  const time = `${formatClockFa(s.start_time)} تا ${formatClockFa(s.end_time)}`;
  const room = s.room ? ` · ${formatRoom(s.room)}` : "";
  return `${withDay ? `${WEEKDAY_NAMES[s.weekday]} ` : ""}${time}${room}`;
}

/** Sessions that meet on `day`, earliest first. */
export function sessionsOnDay<T extends Pick<ClassSession, "weekday" | "start_time">>(sessions: T[], day: DayKey): T[] {
  const weekday = weekdayIndex(day);
  return sessions.filter((s) => s.weekday === weekday).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

// --- Reminder settings (profiles.class_reminder_minutes / deadline_reminder_hours) ---

export const CLASS_REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "خاموش" },
  { value: 10, label: "۱۰ دقیقه قبل" },
  { value: 15, label: "۱۵ دقیقه قبل" },
  { value: 30, label: "۳۰ دقیقه قبل" },
  { value: 60, label: "۱ ساعت قبل" },
  { value: 120, label: "۲ ساعت قبل" },
];

export const DEADLINE_REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "خاموش" },
  { value: 1, label: "۱ ساعت قبل" },
  { value: 3, label: "۳ ساعت قبل" },
  { value: 6, label: "۶ ساعت قبل" },
  { value: 24, label: "۱ روز قبل" },
  { value: 48, label: "۲ روز قبل" },
];
