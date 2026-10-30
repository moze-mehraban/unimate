import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TaskForm } from "@/components/task-form";
import { getPersonalTask } from "@/lib/data/my-work";
import { toTehranInputValue } from "@/lib/format";
import { isUuid } from "@/lib/forms";
import { updateTask } from "../../actions";

export const metadata: Metadata = { title: "ویرایش کار شخصی" };

export default function EditTaskPage({ params }: PageProps<"/tasks/[taskId]/edit">) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
        → کارهای من
      </Link>
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-2xl bg-surface" />}>
        <EditTask params={params} />
      </Suspense>
    </div>
  );
}

async function EditTask({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  if (!isUuid(taskId)) notFound();
  const task = await getPersonalTask(taskId);
  if (!task) notFound();

  return (
    <>
      <h1 className="text-2xl font-bold">ویرایش کار شخصی</h1>
      <section className="rounded-2xl border border-border bg-surface p-6">
        <TaskForm
          action={updateTask.bind(null, task.id)}
          initial={{
            title: task.title,
            description: task.description,
            due_local: toTehranInputValue(task.due_at),
            priority: task.priority,
          }}
          submitLabel="ذخیرهٔ تغییرات"
          titlePlaceholder="مثلاً مرور فصل ۴ برای میان‌ترم"
          descriptionPlaceholder="جزئیات، یادداشت، لینک منابع…"
        />
      </section>
    </>
  );
}
