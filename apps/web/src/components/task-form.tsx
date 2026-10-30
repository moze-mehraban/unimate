"use client";

import { useActionState, useState } from "react";
import { ASSIGNMENT_LIMITS, PRIORITIES } from "@unimate/shared";
import { Alert, Field, SelectField, SubmitButton } from "@/components/ui";
import { formatDeadline, fromTehranInputValue } from "@/lib/format";
import type { FormState } from "@/lib/forms";
import { PRIORITY_LABEL } from "@/lib/labels";

type Values = { title: string; description: string; due_local: string; priority: string };

/** Shared by class assignments and personal tasks (same fields and limits). */
export function TaskForm({
  action,
  initial,
  submitLabel,
  titlePlaceholder,
  descriptionPlaceholder,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Values;
  submitLabel: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values ?? initial;
  const [dueLocal, setDueLocal] = useState(v?.due_local ?? "");
  const duePreview = dueLocal ? fromTehranInputValue(dueLocal) : null;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <Alert kind="error">{state.error}</Alert> : null}
      <Field
        label="عنوان"
        name="title"
        required
        maxLength={ASSIGNMENT_LIMITS.title}
        defaultValue={v?.title}
        error={state.fieldErrors?.title}
        placeholder={titlePlaceholder}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          توضیحات
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={ASSIGNMENT_LIMITS.description}
          defaultValue={v?.description}
          placeholder={descriptionPlaceholder}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {state.fieldErrors?.description ? <p className="text-xs text-danger">{state.fieldErrors.description}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="due_local" className="text-sm font-medium">
            مهلت تحویل
          </label>
          <input
            id="due_local"
            name="due_local"
            type="datetime-local"
            dir="ltr"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {state.fieldErrors?.due_local ? (
            <p className="text-xs text-danger">{state.fieldErrors.due_local}</p>
          ) : (
            <p className="text-xs text-muted">
              {duePreview && !Number.isNaN(duePreview.getTime())
                ? `${formatDeadline(duePreview)} (به وقت تهران)`
                : "اختیاری — به وقت تهران"}
            </p>
          )}
        </div>
        <SelectField label="اولویت" name="priority" defaultValue={v?.priority ?? "medium"} error={state.fieldErrors?.priority}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p].text}
            </option>
          ))}
        </SelectField>
      </div>

      <SubmitButton pendingText="در حال ذخیره…" className="self-start">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
