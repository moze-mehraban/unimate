import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getEditableAssignment } from "@/lib/data/assignments";
import { toTehranInputValue } from "@/lib/format";
import { updateAssignment } from "../../actions";
import { TaskForm } from "@/components/task-form";

export const metadata: Metadata = { title: "ویرایش تکلیف" };

export default function EditAssignmentPage({ params }: PageProps<"/classes/[classId]/assignments/[assignmentId]/edit">) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-2xl bg-surface" />}>
        <EditAssignment params={params} />
      </Suspense>
    </div>
  );
}

async function EditAssignment({ params }: { params: Promise<{ classId: string; assignmentId: string }> }) {
  const { classId, assignmentId } = await params;
  const { cls, assignment } = await getEditableAssignment(classId, assignmentId);

  return (
    <>
      <div>
        <Link href={`/classes/${cls.id}`} className="text-sm text-muted hover:text-foreground">
          → {cls.course_name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">ویرایش تکلیف</h1>
      </div>
      <section className="rounded-2xl border border-border bg-surface p-6">
        <TaskForm
          titlePlaceholder="مثلاً تمرین سری ۳ — نرمال‌سازی"
          descriptionPlaceholder="صورت تمرین، نحوهٔ تحویل، منابع…"
          action={updateAssignment.bind(null, cls.id, assignment.id)}
          initial={{
            title: assignment.title,
            description: assignment.description,
            due_local: toTehranInputValue(assignment.due_at),
            priority: assignment.priority,
          }}
          submitLabel="ذخیرهٔ تغییرات"
        />
      </section>
    </>
  );
}
