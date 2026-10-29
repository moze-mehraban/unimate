import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "داشبورد" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className="h-14 w-64 animate-pulse rounded-lg bg-surface" />}>
        <Greeting />
      </Suspense>

      <section className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
        <h2 className="font-bold">کلاس‌ها و تکالیف به‌زودی</h2>
        <p className="mt-2 text-sm text-muted">
          در مرحلهٔ بعد ساخت کلاس، دعوت هم‌کلاسی‌ها و مدیریت تکالیف اینجا اضافه می‌شود.
        </p>
      </section>
    </div>
  );
}

async function Greeting() {
  const user = await requireUser();
  const firstName = user.profile.full_name.split(" ")[0];

  return (
    <div>
      <h1 className="text-2xl font-bold">سلام{firstName ? ` ${firstName}` : ""} 👋</h1>
      {!user.profile.university ? (
        <p className="mt-1 text-sm text-muted">
          هنوز دانشگاهت را ثبت نکرده‌ای.{" "}
          <Link href="/profile" className="text-primary hover:underline">
            تکمیل پروفایل
          </Link>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">{user.profile.university}</p>
      )}
    </div>
  );
}
