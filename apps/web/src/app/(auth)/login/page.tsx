import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ورود" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">ورود به حساب</h1>
        <p className="mt-1 text-sm text-muted">خوش برگشتی! برای ادامه وارد شو.</p>
      </div>

      {/* Reads ?next and ?error, so it renders at request time. */}
      <Suspense fallback={<div className="h-72" />}>
        <LoginForm />
      </Suspense>

      <p className="text-center text-sm text-muted">
        حساب نداری؟{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          ثبت‌نام کن
        </Link>
      </p>
    </div>
  );
}
