import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonStyles } from "@/components/ui";
import { getMyClasses } from "@/lib/data/classes";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "کلاس‌ها" };

export default function ClassesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">کلاس‌های من</h1>
          <p className="mt-1 text-sm text-muted">برای عضویت در کلاس دیگران، لینک دعوت را از سازندهٔ کلاس بگیر.</p>
        </div>
        <Link href="/classes/new" className={buttonStyles.primary}>
          + کلاس جدید
        </Link>
      </div>

      <Suspense fallback={<ClassGridSkeleton />}>
        <ClassList />
      </Suspense>
    </div>
  );
}

async function ClassList() {
  const classes = await getMyClasses();

  if (!classes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <h2 className="font-bold">هنوز در هیچ کلاسی نیستی</h2>
        <p className="mt-2 text-sm text-muted">یک کلاس بساز یا با لینک دعوت هم‌کلاسی‌هایت به کلاسشان بپیوند.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classes.map((c) => (
        <li key={c.id}>
          <Link
            href={`/classes/${c.id}`}
            className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold">{c.course_name}</h2>
              {c.isOwner ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">سازنده</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted">
              {c.instructor_name ? <span>استاد: {c.instructor_name}</span> : null}
              {c.term ? <span>{c.term}</span> : null}
            </div>
            <span className="mt-auto text-xs text-muted">{formatNumber(c.memberCount)} عضو</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ClassGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
  );
}
