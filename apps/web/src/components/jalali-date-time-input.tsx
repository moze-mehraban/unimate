"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  addDays,
  formatDayNumber,
  jalaliMonth,
  todayKey,
  WEEKDAY_NAMES,
  type DayKey,
} from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { CalendarIcon, ChevronBackIcon, ChevronForwardIcon, ClockIcon } from "./icons";
import { WheelTimePicker } from "./wheel-time-picker";

const DEFAULT_TIME = "23:59";

function faTime(time: string) {
  return time
    .split(":")
    .map((part) => Number(part).toLocaleString("fa-IR", { minimumIntegerDigits: 2 }))
    .join(":");
}

const fieldStyle =
  "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/**
 * Jalali date picker + time, submitted as a hidden "YYYY-MM-DDTHH:mm" in Tehran
 * time (the same format <input type="datetime-local"> used), so server parsing
 * is unchanged.
 */
export function JalaliDateTimeInput({
  id,
  name,
  defaultValue,
  invalid,
  onChange,
}: {
  id?: string;
  name: string;
  /** "YYYY-MM-DDTHH:mm" (Tehran) or "". */
  defaultValue?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
}) {
  const [date, setDate] = useState<DayKey | null>(defaultValue ? defaultValue.slice(0, 10) : null);
  const [time, setTime] = useState(defaultValue ? defaultValue.slice(11, 16) : DEFAULT_TIME);
  const [open, setOpen] = useState<"date" | "time" | null>(null);
  // Any day of the month on screen, and today; set when the picker opens.
  const [view, setView] = useState<DayKey | null>(null);
  const [today, setToday] = useState<DayKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const timePopoverId = useId();

  const value = date ? `${date}T${time}` : "";

  function update(nextDate: DayKey | null, nextTime = time) {
    setDate(nextDate);
    setTime(nextTime);
    onChange?.(nextDate ? `${nextDate}T${nextTime}` : "");
  }

  function openPicker() {
    const now = todayKey();
    setToday(now);
    setView(date ?? now);
    setOpen("date");
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const quickPicks: { label: string; days: number }[] = [
    { label: "امروز", days: 0 },
    { label: "فردا", days: 1 },
    { label: "یک هفته بعد", days: 7 },
  ];

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2">
      <input type="hidden" name={name} value={value} />

      <div className="flex gap-2">
        <button
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open === "date"}
          aria-controls={popoverId}
          onClick={() => (open === "date" ? setOpen(null) : openPicker())}
          className={`flex min-w-0 flex-1 items-center gap-2 text-start ${fieldStyle} ${invalid ? "border-danger" : ""}`}
        >
          <CalendarIcon className="size-4 text-muted" />
          <span className={`truncate ${date ? "" : "text-muted"}`}>
            {date ? formatDate(`${date}T12:00:00Z`) : "انتخاب تاریخ"}
          </span>
        </button>
        <button
          type="button"
          aria-label="ساعت"
          aria-haspopup="dialog"
          aria-expanded={open === "time"}
          aria-controls={timePopoverId}
          disabled={!date}
          onClick={() => setOpen(open === "time" ? null : "time")}
          className={`flex items-center gap-2 disabled:opacity-50 ${fieldStyle}`}
        >
          <ClockIcon className="size-4 text-muted" />
          <span dir="ltr" className="tabular-nums">
            {faTime(time)}
          </span>
        </button>
        {date ? (
          <button
            type="button"
            onClick={() => update(null)}
            className="rounded-lg border border-border px-3 text-sm text-muted hover:bg-background hover:text-danger"
          >
            حذف
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quickPicks.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => update(addDays(todayKey(), q.days))}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted hover:border-primary hover:text-primary"
          >
            {q.label}
          </button>
        ))}
      </div>

      {open === "time" && date ? (
        <div
          id={timePopoverId}
          role="dialog"
          aria-label="انتخاب ساعت"
          className="absolute end-0 top-12 z-20 w-56 rounded-xl border border-border bg-surface p-3 shadow-lg"
        >
          <WheelTimePicker value={time} onChange={(t) => update(date, t)} />
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            تأیید
          </button>
        </div>
      ) : null}

      {open === "date" && view && today ? (
        <MonthPicker
          id={popoverId}
          view={view}
          today={today}
          selected={date}
          onView={setView}
          onPick={(day) => {
            update(day);
            setOpen(null);
          }}
        />
      ) : null}
    </div>
  );
}

function MonthPicker({
  id,
  view,
  today,
  selected,
  onView,
  onPick,
}: {
  id: string;
  view: DayKey;
  today: DayKey;
  selected: DayKey | null;
  onView: (day: DayKey) => void;
  onPick: (day: DayKey) => void;
}) {
  const month = jalaliMonth(view);

  return (
    <div
      id={id}
      role="dialog"
      aria-label="انتخاب تاریخ"
      className="absolute top-12 z-20 w-72 rounded-xl border border-border bg-surface p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="ماه قبل"
          title="ماه قبل"
          onClick={() => onView(addDays(month.first, -1))}
          className="grid size-8 place-items-center rounded-lg hover:bg-background"
        >
          <ChevronBackIcon />
        </button>
        <span className="text-sm font-bold">{month.title}</span>
        <button
          type="button"
          aria-label="ماه بعد"
          title="ماه بعد"
          onClick={() => onView(addDays(month.last, 1))}
          className="grid size-8 place-items-center rounded-lg hover:bg-background"
        >
          <ChevronForwardIcon />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted">
        {WEEKDAY_NAMES.map((d) => (
          <span key={d} className="py-1" title={d}>
            {d.charAt(0)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {month.weeks.flat().map((day) => {
          const inMonth = day >= month.first && day <= month.last;
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              aria-pressed={isSelected}
              aria-label={formatDate(`${day}T12:00:00Z`)}
              className={`grid h-9 place-items-center rounded-lg text-sm ${
                isSelected
                  ? "bg-primary font-bold text-primary-foreground"
                  : day === today
                    ? "font-bold text-primary ring-1 ring-primary ring-inset"
                    : "hover:bg-background"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              {formatDayNumber(day)}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex justify-center border-t border-border pt-2">
        <button
          type="button"
          onClick={() => onView(today)}
          className="rounded-md px-3 py-1 text-xs text-primary hover:bg-background"
        >
          برو به امروز
        </button>
      </div>
    </div>
  );
}
