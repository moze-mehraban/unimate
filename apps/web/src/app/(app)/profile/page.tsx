import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "پروفایل" };

export default function ProfilePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold">پروفایل</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <ProfileSections />
      </Suspense>
    </div>
  );
}

async function ProfileSections() {
  const user = await requireUser();

  return (
    <>
      <Card title="اطلاعات دانشجو" description="هم‌کلاسی‌هایت این اطلاعات را می‌بینند.">
        <div className="mb-4 text-sm">
          <span className="text-muted">ایمیل: </span>
          <span dir="ltr">{user.email}</span>
        </div>
        <ProfileForm fullName={user.profile.full_name} university={user.profile.university} />
      </Card>

      {user.isOAuthOnly ? (
        <Card title="امنیت" description="با حساب گوگل وارد شده‌ای؛ رمز عبور از طریق گوگل مدیریت می‌شود." />
      ) : (
        <Card title="تغییر رمز عبور">
          <PasswordForm />
        </Card>
      )}
    </>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-bold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
