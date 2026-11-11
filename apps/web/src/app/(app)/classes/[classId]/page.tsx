import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/icons";
import { buttonStyles } from "@/components/ui";
import { classColorHex, describeSession } from "@unimate/shared";
import { getClassOrNotFound, getClassSessions } from "@/lib/data/classes";
import { AssignmentsSection } from "./assignments-section";
import { InvitesSection } from "./invites-section";
import { MembersSection } from "./members-section";
import { ReportsSection } from "./reports-section";
import { RequestsSection } from "./requests-section";

export const metadata: Metadata = { title: "کلاس" };

export default function ClassPage({ params }: PageProps<"/classes/[classId]">) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/classes">کلاس‌ها</BackLink>
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
  const sessions = await getClassSessions(cls.id);

  return (
    <>
      <header
        className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-t-4 border-border bg-surface p-6"
        style={{ borderTopColor: classColorHex(cls.color) }}
      >
        <div>
          <h1 className="text-2xl font-bold">{cls.course_name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {cls.instructor_name ? <span>استاد: {cls.instructor_name}</span> : null}
            {cls.term ? <span>{cls.term}</span> : null}
          </div>
          {sessions.length ? (
            <ul className="mt-3 flex flex-col gap-1 text-sm" aria-label="زمان و مکان برگزاری">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: classColorHex(cls.color) }} />
                  {describeSession(s)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Link href={`/classes/${cls.id}/settings`} className={buttonStyles.secondary}>
          {cls.isOwner ? "تنظیمات کلاس" : "خروج از کلاس"}
        </Link>
      </header>

      {cls.isOwner ? <ReportsSection classId={cls.id} /> : null}

      <AssignmentsSection cls={cls} />

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
