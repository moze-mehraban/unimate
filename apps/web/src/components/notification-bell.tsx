"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { BellIcon } from "./icons";

/**
 * Header bell with the unread count, kept live over Supabase Realtime.
 * RLS applies to realtime, so the channel only carries this user's rows.
 */
export function NotificationBell({ userId, initialCount }: { userId: string; initialCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);
  const [ringing, setRinging] = useState(false);

  // A server re-render (e.g. after "mark all read") brings a fresh count.
  const [prevInitial, setPrevInitial] = useState(initialCount);
  if (prevInitial !== initialCount) {
    setPrevInitial(initialCount);
    setCount(initialCount);
  }

  // Handlers run long after mount; read the current path without resubscribing.
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    let ringTimer: ReturnType<typeof setTimeout> | undefined;

    async function recount() {
      const { count: unread } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      if (!cancelled && unread !== null) setCount(unread);
      // Keep the open list in sync too.
      if (pathRef.current === "/notifications") router.refresh();
    }

    (async () => {
      // Join with the user's token; a channel that joins as anon gets nothing past RLS.
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => {
            setRinging(true);
            clearTimeout(ringTimer);
            ringTimer = setTimeout(() => setRinging(false), 1200);
            recount();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          recount,
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      clearTimeout(ringTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const label = count ? `اعلان‌ها (${count.toLocaleString("fa-IR")} خوانده‌نشده)` : "اعلان‌ها";

  return (
    <Link
      href="/notifications"
      aria-label={label}
      title={label}
      className="relative grid size-9 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground"
    >
      <BellIcon className={`size-5 ${ringing ? "animate-bounce text-primary" : ""}`} />
      {count ? (
        <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-primary-foreground">
          {count > 99 ? "۹۹+" : count.toLocaleString("fa-IR")}
        </span>
      ) : null}
    </Link>
  );
}
