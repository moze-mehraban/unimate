"use client";

import { useActionState } from "react";
import { Alert, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";

export function JoinButton({ action }: { action: (prev: FormState) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, {});

  if (state.success) return <Alert kind="success">{state.success}</Alert>;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      <SubmitButton pendingText="در حال ارسال…">درخواست عضویت</SubmitButton>
    </form>
  );
}
