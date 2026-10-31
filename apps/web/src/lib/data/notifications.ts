import "server-only";
import { describeNotification, type NotificationType } from "@unimate/shared";
import { requireUser } from "../auth";
import { formatDeadline, formatTimeAgo } from "../format";
import { createClient } from "../supabase/server";

export type { NotificationType };

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
    ...describeNotification(n.type, n.class_id, n.payload, formatDeadline),
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
