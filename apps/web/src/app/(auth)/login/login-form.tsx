"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { signIn } from "../actions";
import { GoogleButton, OrDivider } from "../google-button";

const URL_ERRORS: Record<string, string> = {
  callback: "لینک ورود نامعتبر یا منقضی شده است. دوباره تلاش کنید.",
  google: "ورود با گوگل انجام نشد. دوباره تلاش کنید.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const urlError = URL_ERRORS[searchParams.get("error") ?? ""];
  const [state, action] = useActionState<FormState, FormData>(signIn, {});

  return (
    <div className="flex flex-col gap-4">
      {state.error || urlError ? <Alert kind="error">{state.error ?? urlError}</Alert> : null}

      <GoogleButton next={next} />
      <OrDivider />

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Field
          label="ایمیل"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          placeholder="you@university.ac.ir"
        />
        <div className="flex flex-col gap-1.5">
          <Field label="رمز عبور" name="password" type="password" autoComplete="current-password" required />
          <Link href="/forgot-password" className="self-start text-xs text-primary hover:underline">
            رمز عبور را فراموش کرده‌ای؟
          </Link>
        </div>
        <SubmitButton pendingText="در حال ورود…">ورود</SubmitButton>
      </form>

      <p className="text-center text-sm text-muted">
        حساب نداری؟{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-primary hover:underline">
          ثبت‌نام کن
        </Link>
      </p>
    </div>
  );
}
