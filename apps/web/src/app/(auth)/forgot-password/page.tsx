import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "بازیابی رمز عبور" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">بازیابی رمز عبور</h1>
        <p className="mt-1 text-sm text-muted">ایمیلت را وارد کن تا لینک تغییر رمز برایت بفرستیم.</p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary hover:underline">
          بازگشت به ورود
        </Link>
      </p>
    </div>
  );
}
