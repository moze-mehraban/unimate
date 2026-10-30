"use client";

import { useActionState, useState } from "react";
import { REPORT_REASON_LIMIT } from "@unimate/shared";
import { Alert, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";

export function ReportForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, {});

  if (state.success) return <span className="text-success">{state.success}</span>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="hover:text-danger hover:underline">
        گزارش اطلاعات نادرست
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex w-full flex-col gap-2">
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      <label htmlFor="reason" className="text-sm font-medium text-foreground">
        چه چیزی در این تکلیف اشتباه است؟
      </label>
      <textarea
        id="reason"
        name="reason"
        rows={2}
        required
        maxLength={REPORT_REASON_LIMIT}
        defaultValue={state.values?.reason}
        placeholder="مثلاً مهلت واقعی پنجشنبه است، نه چهارشنبه."
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
      {state.fieldErrors?.reason ? <p className="text-xs text-danger">{state.fieldErrors.reason}</p> : null}
      <div className="flex gap-2">
        <SubmitButton pendingText="در حال ارسال…" className="!px-3 !py-1.5">
          ارسال گزارش
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm hover:bg-background">
          انصراف
        </button>
      </div>
    </form>
  );
}
