"use client";

import { useActionState } from "react";
import { PASSWORD_MIN_LENGTH, PROFILE_LIMITS } from "@unimate/shared";
import { Alert, Field, SubmitButton } from "@/components/ui";
import type { FormState } from "../../(auth)/actions";
import { updatePassword, updateProfile } from "./actions";

export function ProfileForm({ fullName, university }: { fullName: string; university: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      {state.success ? <Alert kind="success">{state.success}</Alert> : null}
      <Field
        label="نام و نام خانوادگی"
        name="full_name"
        required
        maxLength={PROFILE_LIMITS.fullName}
        defaultValue={state.values?.full_name ?? fullName}
        error={state.fieldErrors?.full_name}
      />
      <Field
        label="دانشگاه"
        name="university"
        maxLength={PROFILE_LIMITS.university}
        defaultValue={state.values?.university ?? university}
        error={state.fieldErrors?.university}
        placeholder="مثلاً دانشگاه تهران"
      />
      <SubmitButton pendingText="در حال ذخیره…" className="self-start">
        ذخیرهٔ تغییرات
      </SubmitButton>
    </form>
  );
}

export function PasswordForm({ redirectToDashboard = false }: { redirectToDashboard?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, {});

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      {state.success ? <Alert kind="success">{state.success}</Alert> : null}
      {redirectToDashboard ? <input type="hidden" name="redirect_to" value="dashboard" /> : null}
      <Field
        label="رمز عبور جدید"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        error={state.fieldErrors?.password}
        hint={`حداقل ${PASSWORD_MIN_LENGTH} کاراکتر`}
      />
      <Field
        label="تکرار رمز عبور جدید"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton pendingText="در حال ذخیره…" className="self-start">
        تغییر رمز عبور
      </SubmitButton>
    </form>
  );
}
