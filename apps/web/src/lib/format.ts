// Persian (Jalali) dates and digits. fa-IR uses the Persian calendar by default.
const dateFmt = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date) {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return dateTimeFmt.format(new Date(value));
}

export function formatNumber(value: number) {
  return value.toLocaleString("fa-IR");
}
