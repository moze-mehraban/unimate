"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Re-renders the page's server components when a class's assignments change.
 * RLS applies to realtime too, so a user only hears about rows they can read.
 */
export function AssignmentsRealtime({ classId, assignmentIds }: { classId: string; assignmentIds: string[] }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  // Delete events carry only the primary key, so match them against what's on screen.
  const idsRef = useRef(new Set(assignmentIds));
  useEffect(() => {
    idsRef.current = new Set(assignmentIds);
  }, [assignmentIds]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Coalesce bursts (e.g. several edits) into one refresh.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    const filter = `class_id=eq.${classId}`;

    (async () => {
      // Join with the user's token. A channel that joins before the stored session
      // is loaded subscribes as anon, and RLS then filters out every event.
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`class-assignments:${classId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "assignments", filter }, refresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "assignments", filter }, refresh)
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "assignments" }, (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id && idsRef.current.has(id)) refresh();
        })
        .subscribe((status) => setLive(status === "SUBSCRIBED"));
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [classId, router]);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted"
      title={live ? "تغییرات تکالیف به‌صورت زنده نمایش داده می‌شود" : "در حال اتصال…"}
    >
      <span className={`size-2 rounded-full ${live ? "bg-success" : "bg-border"}`} />
      {live ? "زنده" : "…"}
    </span>
  );
}
