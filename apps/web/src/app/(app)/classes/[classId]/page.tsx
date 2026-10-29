import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonStyles } from "@/components/ui";
import { getClassOrNotFound } from "@/lib/data/classes";
import { InvitesSection } from "./invites-section";
import { MembersSection } from "./members-section";
import { RequestsSection } from "./requests-section";

export const metadata: Metadata = { title: "کلاس" };

export default function ClassPage({ params }: PageProps<"/classes/[classId]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/classes" className="text-sm text-muted hover:text-foreground">
        → کلاس‌ها
      </Link>
      {/* params are request-time data under Cache Components. */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <ClassView params={params} />
      </Suspense>
    </div>
  );
}

async function ClassView({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const cls = await getClassOrNotFound(classId);

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <h1 className="text-2xl font-bold">{cls.course_name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {cls.instructor_name ? <span>استاد: {cls.instructor_name}</span> : null}
            {cls.term ? <span>{cls.term}</span> : null}
          </div>
        </div>
        <Link href={`/classes/${cls.id}/settings`} className={buttonStyles.secondary}>
          {cls.isOwner ? "تنظیمات کلاس" : "خروج از کلاس"}
        </Link>
      </header>

      <section className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
        تکالیف این کلاس در مرحلهٔ بعد اینجا نمایش داده می‌شوند.
      </section>

      {cls.isOwner ? (
        <>
          <RequestsSection classId={cls.id} />
          <InvitesSection classId={cls.id} />
        </>
      ) : null}

      <MembersSection classId={cls.id} isOwner={cls.isOwner} />
    </>
  );
}
