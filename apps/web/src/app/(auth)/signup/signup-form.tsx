"use client";

import { useActionState } from "react";
import { PASSWORD_MIN_LENGTH, PROFILE_LIMITS } from "@unimate/shared";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { signUp, type FormState } from "../actions";
import { GoogleButton, OrDivider } from "../google-button";

export function SignupForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});

  if (state.success) return <Alert kind="success">{state.success}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}

      <GoogleButton />
      <OrDivider />

      <form action={action} className="flex flex-col gap-4" noValidate>
        <Field
          label="نام و نام خانوادگی"
          name="full_name"
          autoComplete="name"
          required
          maxLength={PROFILE_LIMITS.fullName}
          defaultValue={state.values?.full_name}
          error={state.fieldErrors?.full_name}
        />
        <Field
          label="دانشگاه"
          name="university"
          autoComplete="organization"
          maxLength={PROFILE_LIMITS.university}
          defaultValue={state.values?.university}
          error={state.fieldErrors?.university}
          hint="اختیاری — بعداً هم می‌توانی اضافه کنی."
        />
        <Field
          label="ایمیل"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <Field
          label="رمز عبور"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          error={state.fieldErrors?.password}
          hint={`حداقل ${PASSWORD_MIN_LENGTH} کاراکتر`}
        />
        <SubmitButton pendingText="در حال ساخت حساب…">ثبت‌نام</SubmitButton>
      </form>
    </div>
  );
}
