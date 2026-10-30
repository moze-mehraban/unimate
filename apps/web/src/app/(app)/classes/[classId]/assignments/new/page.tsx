import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getClassOrNotFound } from "@/lib/data/classes";
import { createAssignment } from "../actions";
import { AssignmentForm } from "../assignment-form";

export const metadata: Metadata = { title: "تکلیف جدید" };

export default function NewAssignmentPage({ params }: PageProps<"/classes/[classId]/assignments/new">) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-2xl bg-surface" />}>
        <NewAssignment params={params} />
      </Suspense>
    </div>
  );
}

async function NewAssignment({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const cls = await getClassOrNotFound(classId);

  return (
    <>
      <div>
        <Link href={`/classes/${cls.id}`} className="text-sm text-muted hover:text-foreground">
          → {cls.course_name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">تکلیف جدید</h1>
        <p className="mt-1 text-sm text-muted">همهٔ اعضای کلاس این تکلیف را فوراً می‌بینند و اعلان می‌گیرند.</p>
      </div>
      <section className="rounded-2xl border border-border bg-surface p-6">
        <AssignmentForm action={createAssignment.bind(null, cls.id)} submitLabel="افزودن تکلیف" />
      </section>
    </>
  );
}
