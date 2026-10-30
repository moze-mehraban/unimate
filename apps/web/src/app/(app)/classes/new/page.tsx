import type { Metadata } from "next";
import { BackLink } from "@/components/icons";
import { createClass } from "../actions";
import { ClassForm } from "../class-form";

export const metadata: Metadata = { title: "کلاس جدید" };

export default function NewClassPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <BackLink href="/classes">کلاس‌ها</BackLink>
        <h1 className="mt-2 text-2xl font-bold">ساخت کلاس جدید</h1>
        <p className="mt-1 text-sm text-muted">بعد از ساخت کلاس می‌توانی با لینک دعوت، هم‌کلاسی‌هایت را اضافه کنی.</p>
      </div>
      <section className="rounded-2xl border border-border bg-surface p-6">
        <ClassForm action={createClass} submitLabel="ساخت کلاس" />
      </section>
    </div>
  );
}
