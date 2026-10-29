import type { Metadata } from "next";
import { PasswordForm } from "../profile/profile-forms";

export const metadata: Metadata = { title: "تعیین رمز عبور جدید" };

// Reached from the password-reset email via /auth/callback, which signs the user in.
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <h1 className="text-xl font-bold">تعیین رمز عبور جدید</h1>
      <p className="mt-1 mb-6 text-sm text-muted">رمز عبور جدیدت را وارد کن.</p>
      <PasswordForm redirectToDashboard />
    </div>
  );
}
