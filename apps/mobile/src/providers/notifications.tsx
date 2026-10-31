import type { RealtimeChannel } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./session";

type NotificationsState = {
  unread: number;
  /** Bumps on every change, so open lists know to reload. */
  version: number;
  recount: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsState>({ unread: 0, version: 0, recount: async () => {} });

/**
 * Unread count for the tab badge, kept live over Supabase Realtime (same
 * approach as the web bell). RLS applies, so the channel only carries my rows.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const userId = useUserId();
  const [unread, setUnread] = useState(0);
  const [version, setVersion] = useState(0);

  const recount = useCallback(async () => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (count !== null) setUnread(count);
  }, [userId]);

  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    const onChange = () => {
      recount();
      setVersion((v) => v + 1);
    };

    (async () => {
      // Join with the user's token, or RLS filters out every event.
      const { data } = await supabase.auth.getSession();
      await recount();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;
      const filter = `user_id=eq.${userId}`;
      channel = supabase
        .channel(`notifications:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter }, onChange)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter }, onChange)
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, recount]);

  return <NotificationsContext.Provider value={{ unread, version, recount }}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
