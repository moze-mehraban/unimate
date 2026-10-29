"use client";

import { useActionState } from "react";
import { INVITE_MAX_USES_LIMIT } from "@unimate/shared";
import { Alert, Field, SelectField, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";

export function InviteForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl bg-background p-4" noValidate>
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <SelectField
          label="مدت اعتبار"
          name="expires_in_days"
          defaultValue={state.values?.expires_in_days ?? "7"}
          error={state.fieldErrors?.expires_in_days}
        >
          <option value="1">۱ روز</option>
          <option value="7">۷ روز</option>
          <option value="30">۳۰ روز</option>
          <option value="">بدون انقضا</option>
        </SelectField>
        <Field
          label="حداکثر تعداد استفاده"
          name="max_uses"
          type="number"
          inputMode="numeric"
          min={1}
          max={INVITE_MAX_USES_LIMIT}
          placeholder="نامحدود"
          defaultValue={state.values?.max_uses}
          error={state.fieldErrors?.max_uses}
        />
        <SubmitButton pendingText="در حال ساخت…" className="sm:mt-7">
          ساخت لینک دعوت
        </SubmitButton>
      </div>
    </form>
  );
}
