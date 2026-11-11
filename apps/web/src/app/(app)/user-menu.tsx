import { NotificationBell } from "@/components/notification-bell";
import { SignOutButton, WebPushSync } from "@/components/web-push";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data/notifications";

export async function UserMenu() {
  const user = await requireUser();
  const name = user.profile.full_name || user.email;
  const unread = await getUnreadCount(user.id);

  return (
    <div className="flex items-center gap-2 text-sm sm:gap-3">
      <NotificationBell userId={user.id} initialCount={unread} />
      <span className="hidden max-w-48 truncate text-muted sm:inline" title={user.email}>
        {name}
      </span>
      <SignOutButton />
      <WebPushSync />
    </div>
  );
}
