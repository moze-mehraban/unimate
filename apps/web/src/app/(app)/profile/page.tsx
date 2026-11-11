import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { WebPushToggle } from "@/components/web-push";
import { requireUser } from "@/lib/auth";
import { VAPID_PUBLIC_KEY } from "@/lib/web-push-key";
import { PasswordForm, ProfileForm, ReminderForm } from "./profile-forms";

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

      <Card
        title="یادآوری‌ها"
        description="قبل از شروع جلسه‌های کلاس‌هایت و قبل از مهلت تکالیفی که تمامشان نکرده‌ای، اعلان می‌گیری."
      >
        <ReminderForm
          classMinutes={user.profile.class_reminder_minutes}
          deadlineHours={user.profile.deadline_reminder_hours}
        />
      </Card>

      {VAPID_PUBLIC_KEY ? (
        <Card
          title="اعلان مرورگر"
          description="حتی وقتی سایت بسته است، تکلیف‌های جدید، درخواست‌ها و یادآوری‌ها را به‌صورت اعلان بگیر. برای هر مرورگر و دستگاه جداگانه روشن می‌شود."
        >
          <WebPushToggle />
        </Card>
      ) : null}

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
