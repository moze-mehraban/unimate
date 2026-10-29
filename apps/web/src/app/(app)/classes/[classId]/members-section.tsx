import { ActionButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getMembers } from "@/lib/data/classes";
import { formatDate } from "@/lib/format";
import { removeMember } from "../actions";
import { Avatar, CountBadge, Section } from "./section";

export async function MembersSection({ classId, isOwner }: { classId: string; isOwner: boolean }) {
  const [user, members] = await Promise.all([requireUser(), getMembers(classId)]);

  return (
    <Section title="اعضای کلاس" badge={<CountBadge count={members.length} />}>
      <ul className="divide-y divide-border">
        {members.map((m) => {
          const name = m.fullName || "بدون نام";
          return (
            <li key={m.userId} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={name} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{name}</span>
                    {m.userId === user.id ? <span className="text-xs text-muted">(تو)</span> : null}
                    {m.role === "owner" ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">سازنده</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {m.university ? `${m.university} · ` : ""}عضو از {formatDate(m.joinedAt)}
                  </div>
                </div>
              </div>
              {isOwner && m.role !== "owner" ? (
                <ActionButton
                  action={removeMember.bind(null, classId, m.userId)}
                  confirmText={`«${name}» از کلاس حذف شود؟`}
                  pendingText="در حال حذف…"
                  tone="danger"
                >
                  حذف
                </ActionButton>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
