import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/icons";
import { TaskForm } from "@/components/task-form";
import { getEditableAssignment } from "@/lib/data/assignments";
import { toTehranInputValue } from "@/lib/format";
import { updateAssignment } from "../../actions";

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
        <BackLink href={`/classes/${cls.id}`}>{cls.course_name}</BackLink>
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
