"use client";

import { useActionState, useState } from "react";
import { toFaDigits, WEEKDAY_NAMES } from "@unimate/shared";
import { Alert, Field, SelectField, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

/** Hour + minute selects (Persian digits, 24h) submitted as one "HH:mm" field. */
function TimeSelect({ name, label, defaultValue, error }: { name: string; label: string; defaultValue: string; error?: string }) {
  const [hour, setHour] = useState(defaultValue.slice(0, 2));
  const [minute, setMinute] = useState(defaultValue.slice(3, 5));
  const selectStyle =
    "rounded-lg border border-border bg-surface px-2 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={`${hour}:${minute}`} />
      {/* Hours then minutes, left to right like a clock. */}
      <div dir="ltr" className="flex items-center gap-1">
        <select aria-label={`${label} — ساعت`} value={hour} onChange={(e) => setHour(e.target.value)} className={selectStyle}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {toFaDigits(h)}
            </option>
          ))}
        </select>
        <span className="text-muted">:</span>
        <select aria-label={`${label} — دقیقه`} value={minute} onChange={(e) => setMinute(e.target.value)} className={selectStyle}>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {toFaDigits(m)}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function SessionForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      {state.success ? <Alert kind="success">{state.success}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="روز" name="weekday" defaultValue={v?.weekday ?? "0"} error={state.fieldErrors?.weekday}>
          {WEEKDAY_NAMES.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </SelectField>
        <TimeSelect name="start_time" label="شروع" defaultValue={v?.start_time ?? "08:00"} error={state.fieldErrors?.start_time} />
        <TimeSelect name="end_time" label="پایان" defaultValue={v?.end_time ?? "09:30"} error={state.fieldErrors?.end_time} />
      </div>
      <Field
        label="اتاق / مکان"
        name="room"
        maxLength={80}
        defaultValue={v?.room}
        error={state.fieldErrors?.room}
        placeholder="مثلاً ۲۰۳ یا آزمایشگاه شبکه"
      />
      <SubmitButton pendingText="در حال افزودن…" className="self-start">
        افزودن جلسه
      </SubmitButton>
    </form>
  );
}
