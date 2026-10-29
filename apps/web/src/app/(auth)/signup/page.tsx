import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "ثبت‌نام" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">ساخت حساب</h1>
        <p className="mt-1 text-sm text-muted">تکالیفت را با هم‌کلاسی‌هایت هماهنگ کن.</p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-muted">
        حساب داری؟{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          وارد شو
        </Link>
      </p>
    </div>
  );
}
