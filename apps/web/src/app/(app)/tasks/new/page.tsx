import type { Metadata } from "next";
import { BackLink } from "@/components/icons";
import { TaskForm } from "@/components/task-form";
import { createTask } from "../actions";

export const metadata: Metadata = { title: "کار شخصی جدید" };

export default function NewTaskPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <BackLink href="/dashboard">کارهای من</BackLink>
        <h1 className="mt-2 text-2xl font-bold">کار شخصی جدید</h1>
        <p className="mt-1 text-sm text-muted">فقط خودت این کار را می‌بینی.</p>
      </div>
      <section className="rounded-2xl border border-border bg-surface p-6">
        <TaskForm
          action={createTask}
          submitLabel="افزودن کار"
          titlePlaceholder="مثلاً مرور فصل ۴ برای میان‌ترم"
          descriptionPlaceholder="جزئیات، یادداشت، لینک منابع…"
        />
      </section>
    </div>
  );
}
