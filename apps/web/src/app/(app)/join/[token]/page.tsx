import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonStyles } from "@/components/ui";
import { getInvitePreview } from "@/lib/data/classes";
import { requestToJoin } from "../../classes/actions";
import { JoinButton } from "./join-button";

export const metadata: Metadata = { title: "دعوت به کلاس" };

// Signed-out visitors are sent to /login?next=/join/<token> by the proxy.
export default function JoinPage({ params }: PageProps<"/join/[token]">) {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
        <JoinCard params={params} />
      </Suspense>
    </div>
  );
}

async function JoinCard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Tokens are 36 hex chars; skip the DB for anything else.
  const preview = /^[0-9a-f]{16,128}$/i.test(token) ? await getInvitePreview(token) : null;

  if (!preview) {
    return (
      <Card title="لینک دعوت نامعتبر است">
        <p className="text-sm text-muted">این لینک وجود ندارد. از سازندهٔ کلاس یک لینک جدید بگیر.</p>
        <Link href="/classes" className={`${buttonStyles.secondary} mt-5`}>
          کلاس‌های من
        </Link>
      </Card>
    );
  }

  return (
    <Card title={preview.course_name}>
      <div className="flex flex-col gap-1 text-sm text-muted">
        {preview.instructor_name ? <span>استاد: {preview.instructor_name}</span> : null}
        {preview.term ? <span>{preview.term}</span> : null}
      </div>

      <div className="mt-6">
        {preview.is_member ? (
          <>
            <p className="text-sm">تو عضو این کلاس هستی.</p>
            <Link href={`/classes/${preview.class_id}`} className={`${buttonStyles.primary} mt-4`}>
              رفتن به کلاس
            </Link>
          </>
        ) : preview.has_pending_request ? (
          <p className="rounded-lg bg-background px-3 py-2.5 text-sm">
            درخواست عضویتت ثبت شده و منتظر تأیید سازندهٔ کلاس است.
          </p>
        ) : !preview.is_valid ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
            این لینک دعوت دیگر معتبر نیست (لغو شده، منقضی شده یا ظرفیتش پر شده). از سازندهٔ کلاس لینک جدید بگیر.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              برای عضویت در این کلاس درخواست بده. پس از تأیید سازندهٔ کلاس، به تکالیف کلاس دسترسی پیدا می‌کنی.
            </p>
            <JoinButton action={requestToJoin.bind(null, token)} />
          </>
        )}
      </div>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <p className="text-xs text-muted">دعوت به کلاس</p>
      <h1 className="mt-1 mb-3 text-xl font-bold">{title}</h1>
      {children}
    </section>
  );
}
