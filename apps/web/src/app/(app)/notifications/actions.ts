"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

// RLS + column grants: users can only set read_at on their own notifications.

export async function markNotificationRead(id: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  refresh();
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  refresh();
}

/** Clicking a notification: mark it read, then go where it points. */
export async function openNotification(id: string, href: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  redirect(safeNextPath(href, "/notifications"));
}
