import { CopyButton } from "@/components/copy-button";
import { ActionButton } from "@/components/ui";
import { getInvites, type InviteState } from "@/lib/data/classes";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { getOrigin } from "@/lib/redirect";
import { createInvite, revokeInvite } from "../actions";
import { InviteForm } from "./invite-form";
import { Section } from "./section";

const STATE_LABEL: Record<InviteState, { text: string; className: string }> = {
  active: { text: "فعال", className: "bg-success-soft text-success" },
  revoked: { text: "لغو شده", className: "bg-background text-muted" },
  expired: { text: "منقضی", className: "bg-background text-muted" },
  used_up: { text: "ظرفیت پر", className: "bg-background text-muted" },
};

export async function InvitesSection({ classId }: { classId: string }) {
  const [invites, origin] = await Promise.all([getInvites(classId), getOrigin()]);

  return (
    <Section
      title="لینک‌های دعوت"
      description="فقط کسانی که لینک را دارند می‌توانند درخواست عضویت بدهند و عضویتشان باید توسط تو تأیید شود."
    >
      <InviteForm action={createInvite.bind(null, classId)} />

      {invites.length ? (
        <ul className="mt-5 flex flex-col gap-3">
          {invites.map((inv) => {
            const url = `${origin}/join/${inv.token}`;
            const label = STATE_LABEL[inv.state];
            const active = inv.state === "active";
            return (
              <li key={inv.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${label.className}`}>{label.text}</span>
                    <span className="text-muted">ساخته‌شده {formatDate(inv.createdAt)}</span>
                  </div>
                  {active ? (
                    <div className="flex gap-2">
                      <CopyButton text={url} />
                      <ActionButton
                        action={revokeInvite.bind(null, inv.id)}
                        tone="danger"
                        pendingText="…"
                        confirmText="این لینک لغو شود؟ دیگر کسی نمی‌تواند با آن درخواست عضویت بدهد."
                      >
                        لغو
                      </ActionButton>
                    </div>
                  ) : null}
                </div>
                {active ? (
                  <code dir="ltr" className="mt-3 block truncate rounded-lg bg-background px-3 py-2 text-left text-xs">
                    {url}
                  </code>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted">
                  <span>
                    استفاده: {formatNumber(inv.useCount)}
                    {inv.maxUses !== null ? ` از ${formatNumber(inv.maxUses)}` : ""}
                  </span>
                  <span>{inv.expiresAt ? `اعتبار تا ${formatDateTime(inv.expiresAt)}` : "بدون تاریخ انقضا"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}
