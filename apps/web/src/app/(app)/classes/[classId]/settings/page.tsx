import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/icons";
import { ActionButton } from "@/components/ui";
import { getClassOrNotFound } from "@/lib/data/classes";
import { deleteClass, leaveClass, updateClass } from "../../actions";
import { ClassForm } from "../../class-form";

export const metadata: Metadata = { title: "تنظیمات کلاس" };

export default function ClassSettingsPage({ params }: PageProps<"/classes/[classId]/settings">) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Settings params={params} />
      </Suspense>
    </div>
  );
}

async function Settings({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const cls = await getClassOrNotFound(classId);

  return (
    <>
      <div>
        <BackLink href={`/classes/${cls.id}`}>{cls.course_name}</BackLink>
        <h1 className="mt-2 text-2xl font-bold">{cls.isOwner ? "تنظیمات کلاس" : "عضویت در کلاس"}</h1>
      </div>

      {cls.isOwner ? (
        <>
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-4 font-bold">اطلاعات کلاس</h2>
            <ClassForm
              action={updateClass.bind(null, cls.id)}
              initial={{ course_name: cls.course_name, instructor_name: cls.instructor_name, term: cls.term }}
              submitLabel="ذخیرهٔ تغییرات"
            />
          </section>

          <DangerZone
            title="حذف کلاس"
            description="کلاس، تکالیف، لینک‌های دعوت و عضویت همهٔ اعضا برای همیشه حذف می‌شوند."
          >
            <ActionButton
              action={deleteClass.bind(null, cls.id)}
              tone="danger"
              pendingText="در حال حذف…"
              confirmText={`کلاس «${cls.course_name}» برای همیشه حذف شود؟ این کار قابل بازگشت نیست.`}
            >
              حذف کلاس
            </ActionButton>
          </DangerZone>
        </>
      ) : (
        <DangerZone
          title="خروج از کلاس"
          description="بعد از خروج، دیگر تکالیف این کلاس را نمی‌بینی. برای عضویت دوباره به لینک دعوت جدید نیاز داری."
        >
          <ActionButton
            action={leaveClass.bind(null, cls.id)}
            tone="danger"
            pendingText="در حال خروج…"
            confirmText={`از کلاس «${cls.course_name}» خارج می‌شوی؟`}
          >
            خروج از کلاس
          </ActionButton>
        </DangerZone>
      )}
    </>
  );
}

function DangerZone({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-danger/30 bg-surface p-6">
      <h2 className="font-bold text-danger">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-muted">{description}</p>
      {children}
    </section>
  );
}
