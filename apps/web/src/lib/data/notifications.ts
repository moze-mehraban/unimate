import "server-only";
import type { Enums, Json } from "@unimate/shared";
import { requireUser } from "../auth";
import { formatDeadline, formatTimeAgo } from "../format";
import { createClient } from "../supabase/server";

export type NotificationType = Enums<"notification_type">;

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Where clicking it goes. */
  href: string;
  unread: boolean;
  timeAgo: string;
};

/** How many notifications the list page shows. */
export const NOTIFICATIONS_PAGE_SIZE = 50;

type Payload = Record<string, string | null | undefined>;

function asPayload(json: Json): Payload {
  return json && typeof json === "object" && !Array.isArray(json) ? (json as Payload) : {};
}

/** Text and link for each type. Names come from the payload (snapshotted by the trigger). */
function describe(type: NotificationType, classId: string | null, p: Payload): Pick<NotificationItem, "title" | "body" | "href"> {
  const course = p.course_name || "کلاس";
  const classHref = classId ? `/classes/${classId}` : "/classes";

  switch (type) {
    case "assignment_created":
      return {
        title: `تکلیف جدید در ${course}`,
        body: `«${p.title ?? ""}»${p.creator_name ? ` — ثبت توسط ${p.creator_name}` : ""}${
          p.due_at ? ` · مهلت: ${formatDeadline(p.due_at)}` : ""
        }`,
        href: p.assignment_id ? `${classHref}#assignment-${p.assignment_id}` : classHref,
      };
    case "join_request_received":
      return {
        title: `درخواست عضویت در ${course}`,
        body: `${p.requester_name || "یک کاربر"} می‌خواهد به کلاس بپیوندد.`,
        href: `${classHref}#requests`,
      };
    case "join_request_approved":
      return { title: "درخواستت تأیید شد", body: `حالا عضو ${course} هستی.`, href: classHref };
    case "join_request_rejected":
      // Not a member, so the class page would 404.
      return { title: "درخواستت رد شد", body: `درخواست عضویت در ${course} پذیرفته نشد.`, href: "/classes" };
    case "assignment_reported":
      return {
        title: `گزارش اطلاعات نادرست در ${course}`,
        body: `«${p.title ?? ""}»: ${p.reason ?? ""}`,
        href: `${classHref}#reports`,
      };
  }
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, class_id, payload, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_PAGE_SIZE);
  if (error) throw error;

  const now = Date.now();
  return data.map((n) => ({
    id: n.id,
    type: n.type,
    ...describe(n.type, n.class_id, asPayload(n.payload)),
    unread: !n.read_at,
    timeAgo: formatTimeAgo(n.created_at, now),
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
