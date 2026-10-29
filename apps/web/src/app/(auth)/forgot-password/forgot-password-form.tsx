"use client";

import { useActionState } from "react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, {});

  if (state.success) return <Alert kind="success">{state.success}</Alert>;

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      <Field label="ایمیل" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      <SubmitButton pendingText="در حال ارسال…">ارسال لینک بازیابی</SubmitButton>
    </form>
  );
}
