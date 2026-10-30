"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { PASSWORD_MIN_LENGTH, PROFILE_LIMITS } from "@unimate/shared";
import { Alert, Field, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { signUp } from "../actions";
import { GoogleButton, OrDivider } from "../google-button";

export function SignupForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action] = useActionState<FormState, FormData>(signUp, {});

  if (state.success) return <Alert kind="success">{state.success}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}

      <GoogleButton next={next} />
      <OrDivider />

      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
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

      <p className="text-center text-sm text-muted">
        حساب داری؟{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-primary hover:underline">
          وارد شو
        </Link>
      </p>
    </div>
  );
}
