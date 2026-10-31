// Jalali (Persian) calendar and Tehran time in plain arithmetic, without Intl.
//
// The web app formats with Intl's Persian calendar, but React Native's Hermes
// engine doesn't reliably support Intl calendars/time zones on every platform,
// so the mobile app uses these. Days are "YYYY-MM-DD" keys of the Gregorian date
// in Tehran (same convention as the web calendar). Iran has had no DST since
// 2022, so Tehran is always UTC+03:30.

export type DayKey = string;

const DAY_MS = 86_400_000;
export const TEHRAN_OFFSET_MS = 3.5 * 3_600_000;

export const JALALI_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];
/** Saturday-first, as on Iranian calendars. */
export const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** "12:05" → "۱۲:۰۵" */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

const pad = (n: number) => String(n).padStart(2, "0");

// --- Gregorian ⇄ Jalali (33-year arithmetic cycle) -------------------------

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gDaysBeforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) +
    gd + gDaysBeforeMonth[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = days < 186 ? 1 + (days % 31) : 1 + ((days - 186) % 30);
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const y = jy + 1595;
  let days =
    -355668 + 365 * y + Math.floor(y / 33) * 8 + Math.floor(((y % 33) + 3) / 4) + jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && gd > monthDays[gm]) gd -= monthDays[gm++];
  return [gy, gm + 1, gd];
}

// --- Day keys -----------------------------------------------------------------

function keyToUtcNoon(key: DayKey) {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)), 12);
}

function utcToKey(ms: number): DayKey {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && utcToKey(keyToUtcNoon(value)) === value;
}

export function addDays(key: DayKey, days: number): DayKey {
  return utcToKey(keyToUtcNoon(key) + days * DAY_MS);
}

/** 0 = Saturday … 6 = Friday. */
export function weekdayIndex(key: DayKey): number {
  return (new Date(keyToUtcNoon(key)).getUTCDay() + 1) % 7;
}

export function jalaliOfKey(key: DayKey) {
  const [year, month, day] = gregorianToJalali(Number(key.slice(0, 4)), Number(key.slice(5, 7)), Number(key.slice(8, 10)));
  return { year, month, day };
}

export function keyOfJalali(jy: number, jm: number, jd: number): DayKey {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

// --- Tehran time ----------------------------------------------------------------

/** Wall-clock parts of an instant in Tehran. */
function tehran(value: string | Date | number) {
  const d = new Date(new Date(value).getTime() + TEHRAN_OFFSET_MS);
  return { key: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

export function dayKeyOf(value: string | Date | number): DayKey {
  return tehran(value).key;
}

export function todayKey(now = Date.now()): DayKey {
  return dayKeyOf(now);
}

/** Instant → "YYYY-MM-DDTHH:mm" in Tehran (the form value the app submits). */
export function toTehranLocal(iso: string | null): string {
  if (!iso) return "";
  const t = tehran(iso);
  return `${t.key}T${pad(t.hour)}:${pad(t.minute)}`;
}

/** "YYYY-MM-DDTHH:mm" in Tehran → ISO instant, or null if malformed. */
export function fromTehranLocal(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - TEHRAN_OFFSET_MS;
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

// --- Formatting -----------------------------------------------------------------

/** "۱۴ آبان ۱۴۰۵" */
export function formatJalaliDay(key: DayKey): string {
  const j = jalaliOfKey(key);
  return toFaDigits(`${j.day} ${JALALI_MONTH_NAMES[j.month - 1]} ${j.year}`);
}

/** "پنجشنبه ۱۴ آبان" */
export function formatDayTitle(key: DayKey): string {
  const j = jalaliOfKey(key);
  return `${WEEKDAY_NAMES[weekdayIndex(key)]} ${toFaDigits(j.day)} ${JALALI_MONTH_NAMES[j.month - 1]}`;
}

/** "۲۳:۵۹" in Tehran. */
export function formatTimeFa(value: string | Date): string {
  const t = tehran(value);
  return toFaDigits(`${pad(t.hour)}:${pad(t.minute)}`);
}

/** "پنجشنبه ۱۴ آبان ساعت ۲۳:۵۹" — deadlines, where the weekday matters. */
export function formatDeadlineFa(value: string | Date): string {
  return `${formatDayTitle(dayKeyOf(value))} ساعت ${formatTimeFa(value)}`;
}

/** The Jalali month containing `key`: bounds and a Saturday-first grid of whole weeks. */
export function jalaliMonthGrid(key: DayKey) {
  const { year, month } = jalaliOfKey(key);
  const first = keyOfJalali(year, month, 1);
  const next = month === 12 ? keyOfJalali(year + 1, 1, 1) : keyOfJalali(year, month + 1, 1);
  const last = addDays(next, -1);
  const weeks: DayKey[][] = [];
  for (let start = addDays(first, -weekdayIndex(first)); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return { year, month, first, last, weeks, title: toFaDigits(`${JALALI_MONTH_NAMES[month - 1]} ${year}`) };
}

// --- Relative times ---------------------------------------------------------------

export type DueState = "overdue" | "soon" | "upcoming" | "none";

/** "۳ روز مانده" / "۲ ساعت گذشته", and how urgent it is. */
export function describeDue(dueAt: string | null, now = Date.now()): { text: string; state: DueState } {
  if (!dueAt) return { text: "بدون مهلت", state: "none" };
  const diff = new Date(dueAt).getTime() - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / DAY_MS);
  const hours = Math.floor(abs / 3_600_000);
  const amount =
    days >= 1 ? `${toFaDigits(days)} روز` : hours >= 1 ? `${toFaDigits(hours)} ساعت` : `${toFaDigits(Math.max(1, Math.floor(abs / 60_000)))} دقیقه`;
  if (diff < 0) return { text: `${amount} گذشته`, state: "overdue" };
  return { text: `${amount} مانده`, state: diff < 2 * DAY_MS ? "soon" : "upcoming" };
}

/** "همین الان" / "۵ دقیقه پیش" / "۳ روز پیش", or the date after a week. */
export function formatTimeAgoFa(value: string, now = Date.now()): string {
  const minutes = Math.floor(Math.max(0, now - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${toFaDigits(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toFaDigits(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${toFaDigits(days)} روز پیش`;
  return formatJalaliDay(dayKeyOf(value));
}
