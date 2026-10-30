"use client";

import { useActionState } from "react";
import { CLASS_LIMITS } from "@unimate/shared";
import { Alert, Field, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/forms";

type Values = { course_name: string; instructor_name: string; term: string };

/** Shared by "new class" and the class settings page. */
export function ClassForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Values;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values ?? initial;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      {state.success ? <Alert kind="success">{state.success}</Alert> : null}
      <Field
        label="نام درس"
        name="course_name"
        required
        maxLength={CLASS_LIMITS.courseName}
        defaultValue={v?.course_name}
        error={state.fieldErrors?.course_name}
        placeholder="مثلاً پایگاه داده"
      />
      <Field
        label="نام استاد"
        name="instructor_name"
        maxLength={CLASS_LIMITS.instructorName}
        defaultValue={v?.instructor_name}
        error={state.fieldErrors?.instructor_name}
        placeholder="مثلاً دکتر رضایی"
      />
      <Field
        label="ترم تحصیلی"
        name="term"
        maxLength={CLASS_LIMITS.term}
        defaultValue={v?.term}
        error={state.fieldErrors?.term}
        placeholder="مثلاً نیمسال اول ۱۴۰۵-۱۴۰۶"
      />
      <SubmitButton pendingText="در حال ذخیره…" className="self-start">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
