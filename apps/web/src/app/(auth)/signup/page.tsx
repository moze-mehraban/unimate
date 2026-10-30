import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "ثبت‌نام" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">ساخت حساب</h1>
        <p className="mt-1 text-sm text-muted">تکالیفت را با هم‌کلاسی‌هایت هماهنگ کن.</p>
      </div>

      {/* Reads ?next, so it renders at request time. */}
      <Suspense fallback={<div className="h-96" />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
