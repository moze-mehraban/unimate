import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/ui";
import { getNotifications, NOTIFICATIONS_PAGE_SIZE, type NotificationItem } from "@/lib/data/notifications";
import { formatNumber } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead, openNotification } from "./actions";

export const metadata: Metadata = { title: "اعلان‌ها" };

type SearchParams = Record<string, string | string[] | undefined>;

export default function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">اعلان‌ها</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <NotificationList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NotificationList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { show } = await searchParams;
  const unreadOnly = show === "unread";
  const all = await getNotifications();
  const unreadCount = all.filter((n) => n.unread).length;
  const visible = unreadOnly ? all.filter((n) => n.unread) : all;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex rounded-lg bg-background p-0.5 text-sm" aria-label="فیلتر">
          {[
            { href: "/notifications", label: "همه", active: !unreadOnly },
            {
              href: "/notifications?show=unread",
              label: `خوانده‌نشده${unreadCount ? ` (${formatNumber(unreadCount)})` : ""}`,
              active: unreadOnly,
            },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`rounded-md px-3 py-1 ${tab.active ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        {unreadCount ? (
          <div className="ms-auto">
            <ActionButton action={markAllNotificationsRead} pendingText="…">
              همه را خوانده‌شده کن
            </ActionButton>
          </div>
        ) : null}
      </div>

      {visible.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {visible.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-background p-8 text-center text-sm text-muted">
          {unreadOnly ? "همهٔ اعلان‌ها را خوانده‌ای. 👌" : "هنوز اعلانی نداری."}
        </p>
      )}

      {all.length === NOTIFICATIONS_PAGE_SIZE ? (
        <p className="mt-4 text-center text-xs text-muted">
          {formatNumber(NOTIFICATIONS_PAGE_SIZE)} اعلان آخر نمایش داده شده است.
        </p>
      ) : null}
    </section>
  );
}

function NotificationRow({ notification: n }: { notification: NotificationItem }) {
  return (
    <li className="flex items-start gap-2 py-1">
      {/* The whole row opens the target; it's a form so opening also marks it read. */}
      <form action={openNotification.bind(null, n.id, n.href)} className="min-w-0 flex-1">
        <button
          type="submit"
          className={`flex w-full items-start gap-3 rounded-lg p-3 text-start hover:bg-background ${n.unread ? "" : "opacity-70"}`}
        >
          <span
            aria-hidden="true"
            className={`mt-2 size-2 shrink-0 rounded-full ${n.unread ? "bg-primary" : "bg-transparent"}`}
          />
          <span className="min-w-0 flex-1">
            <span className={`block text-sm ${n.unread ? "font-bold" : "font-medium"}`}>
              {n.unread ? <span className="sr-only">خوانده‌نشده: </span> : null}
              {n.title}
            </span>
            <span className="mt-0.5 block text-sm break-words text-muted">{n.body}</span>
            <span className="mt-1 block text-xs text-muted">{n.timeAgo}</span>
          </span>
        </button>
      </form>
      {n.unread ? (
        <form action={markNotificationRead.bind(null, n.id)} className="pt-2">
          <button
            type="submit"
            title="علامت خوانده‌شده"
            aria-label={`علامت خوانده‌شده: ${n.title}`}
            className="rounded-md px-2 py-1 text-xs text-muted hover:bg-background hover:text-foreground"
          >
            خواندم
          </button>
        </form>
      ) : null}
    </li>
  );
}
