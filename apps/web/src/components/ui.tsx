"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const buttonStyles = {
  primary: `${buttonBase} bg-primary text-primary-foreground hover:bg-primary-hover`,
  secondary: `${buttonBase} border border-border bg-surface text-foreground hover:bg-background`,
};

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: keyof typeof buttonStyles;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonStyles[variant]} ${className}`}>
      {pending ? (pendingText ?? "لطفاً صبر کنید…") : children}
    </button>
  );
}

export function Field({
  label,
  error,
  hint,
  ...inputProps
}: ComponentProps<"input"> & { label: string; error?: string; hint?: string }) {
  const id = inputProps.id ?? inputProps.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-danger"
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  children,
  ...selectProps
}: ComponentProps<"select"> & { label: string; error?: string; hint?: string }) {
  const id = selectProps.id ?? selectProps.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        {...selectProps}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/**
 * A one-button form for a bound server action, with an optional confirm()
 * prompt for destructive actions.
 */
export function ActionButton({
  action,
  children,
  confirmText,
  pendingText,
  tone = "neutral",
}: {
  action: () => Promise<void>;
  children: ReactNode;
  confirmText?: string;
  pendingText?: string;
  tone?: "neutral" | "danger" | "primary";
}) {
  const tones = {
    neutral: "border border-border text-foreground hover:bg-background",
    danger: "border border-border text-danger hover:bg-danger-soft",
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  };
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <PendingButton className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${tones[tone]}`} pendingText={pendingText}>
        {children}
      </PendingButton>
    </form>
  );
}

function PendingButton({ children, pendingText, className }: { children: ReactNode; pendingText?: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (pendingText ?? "…") : children}
    </button>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const styles = kind === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}
