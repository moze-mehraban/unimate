import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/icons";
import { ActionButton } from "@/components/ui";
import { describeSession, type ClassColor } from "@unimate/shared";
import { getClassOrNotFound, getClassSessions } from "@/lib/data/classes";
import { addSession, deleteClass, deleteSession, leaveClass, updateClass } from "../../actions";
import { ClassForm } from "../../class-form";
import { ColorPicker } from "./color-picker";
import { SessionForm } from "./session-form";

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
  const sessions = cls.isOwner ? await getClassSessions(cls.id) : [];

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

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-bold">رنگ کلاس</h2>
            <p className="mt-1 mb-4 text-sm text-muted">در تقویم و فهرست کارها، تکالیف و جلسه‌های این کلاس با این رنگ نشان داده می‌شوند.</p>
            <ColorPicker classId={cls.id} color={cls.color as ClassColor} />
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-bold">زمان و مکان برگزاری</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              جلسه‌های هفتگی کلاس (به وقت تهران). در تقویم همهٔ اعضا نشان داده می‌شوند و قبل از شروع برایشان یادآوری می‌رود.
            </p>
            {sessions.length ? (
              <ul className="mb-5 flex flex-col divide-y divide-border rounded-xl border border-border">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>{describeSession(s)}</span>
                    <ActionButton
                      action={deleteSession.bind(null, s.id)}
                      tone="danger"
                      pendingText="…"
                      confirmText="این جلسه از برنامهٔ کلاس حذف شود؟"
                    >
                      حذف
                    </ActionButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-5 rounded-xl bg-background p-4 text-sm text-muted">هنوز جلسه‌ای ثبت نشده.</p>
            )}
            <SessionForm action={addSession.bind(null, cls.id)} />
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
