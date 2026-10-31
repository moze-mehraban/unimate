import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

/**
 * Calls `onChange` (debounced) when a class's assignments change, and reports
 * whether the channel is live. Same approach as the web's AssignmentsRealtime.
 */
export function useClassRealtime(classId: string, assignmentIds: string[], onChange: () => void): boolean {
  const [live, setLive] = useState(false);
  // DELETE events carry only the primary key (RLS), so match them against what's on screen.
  const idsRef = useRef(new Set(assignmentIds));
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    idsRef.current = new Set(assignmentIds);
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), 300);
    };
    const filter = `class_id=eq.${classId}`;

    (async () => {
      // Join with the user's token, or RLS filters out every event.
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
  }, [classId]);

  return live;
}
