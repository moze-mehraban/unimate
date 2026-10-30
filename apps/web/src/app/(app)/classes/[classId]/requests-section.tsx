import { ActionButton } from "@/components/ui";
import { getPendingRequests } from "@/lib/data/classes";
import { formatDateTime } from "@/lib/format";
import { respondToRequest } from "../actions";
import { Avatar, CountBadge, Section } from "./section";

export async function RequestsSection({ classId }: { classId: string }) {
  const requests = await getPendingRequests(classId);

  return (
    <Section title="درخواست‌های عضویت" badge={requests.length ? <CountBadge count={requests.length} /> : null}>
      {requests.length ? (
        <ul className="divide-y divide-border">
          {requests.map((r) => {
            const name = r.fullName || "بدون نام";
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={name} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{name}</div>
                    <div className="truncate text-xs text-muted">
                      {r.university ? `${r.university} · ` : ""}
                      {formatDateTime(r.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ActionButton action={respondToRequest.bind(null, r.id, true)} tone="primary" pendingText="…">
                    تأیید
                  </ActionButton>
                  <ActionButton
                    action={respondToRequest.bind(null, r.id, false)}
                    tone="danger"
                    pendingText="…"
                    confirmText={`درخواست «${name}» رد شود؟`}
                  >
                    رد
                  </ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">درخواست در انتظاری وجود ندارد.</p>
      )}
    </Section>
  );
}
