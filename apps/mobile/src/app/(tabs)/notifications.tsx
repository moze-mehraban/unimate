import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import {
  describeNotification,
  formatDeadlineFa,
  formatTimeAgoFa,
  GENERIC_ERROR,
  toFaDigits,
  type NotificationType,
} from "@unimate/shared";
import { AppText, Banner, Loading, Segmented, SmallButton } from "@/components/ui";
import { notify } from "@/lib/dialogs";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { useNotifications } from "@/providers/notifications";
import { useUserId } from "@/providers/session";

type Item = { id: string; type: NotificationType; title: string; body: string; href: string; unread: boolean; createdAt: string };

const PAGE_SIZE = 50;

/** describeNotification's web paths match the app's routes; only the #anchors don't apply here. */
function appRoute(href: string): string {
  return href.split("#")[0];
}

export default function NotificationsScreen() {
  const c = useColors();
  const userId = useUserId();
  const { unread, version, recount } = useNotifications();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("notifications")
      .select("id, type, class_id, payload, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (e) return setError("بارگذاری اعلان‌ها انجام نشد. دوباره بکش.");
    setError(null);
    setItems(
      data.map((n) => ({
        id: n.id,
        type: n.type,
        ...describeNotification(n.type, n.class_id, n.payload, formatDeadlineFa),
        unread: !n.read_at,
        createdAt: n.created_at,
      })),
    );
  }, [userId]);

  // Reload on focus, and while focused whenever a notification arrives or is
  // read elsewhere (e.g. on the website): `version` changes the callback.
  useFocusEffect(
    useCallback(() => {
      load();
      // `version` isn't read here; it's listed so a change re-runs the reload.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, version]),
  );

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    setItems((list) => list?.map((n) => (ids.includes(n.id) ? { ...n, unread: false } : n)) ?? null);
    const { error: e } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .is("read_at", null);
    if (e) {
      notify("انجام نشد", GENERIC_ERROR);
      load();
    }
    recount();
  }

  async function open(n: Item) {
    if (n.unread) await markRead([n.id]);
    router.push(appRoute(n.href));
  }

  if (!items && !error) return <Loading />;
  const all = items ?? [];
  const visible = tab === "unread" ? all.filter((n) => n.unread) : all;

  return (
    <FlatList
      data={visible}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([load(), recount()]);
            setRefreshing(false);
          }}
          tintColor={c.primary}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 4 }}>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: "همه" },
                { value: "unread", label: unread ? `خوانده‌نشده (${toFaDigits(unread)})` : "خوانده‌نشده" },
              ]}
            />
            <View style={{ flex: 1 }} />
            {unread ? (
              <SmallButton onPress={() => markRead(all.filter((n) => n.unread).map((n) => n.id))}>همه خوانده شد</SmallButton>
            ) : null}
          </View>
        </View>
      }
      renderItem={({ item: n }) => (
        <Pressable
          role="button"
          onPress={() => open(n)}
          style={({ pressed }) => ({
            flexDirection: "row",
            gap: 10,
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            opacity: pressed ? 0.85 : n.unread ? 1 : 0.7,
          })}
        >
          <View
            style={{ width: 8, height: 8, borderRadius: 4, marginTop: 8, backgroundColor: n.unread ? c.primary : "transparent" }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText size={14} weight={n.unread ? "bold" : "medium"}>
              {n.title}
            </AppText>
            <AppText size={13} tone="muted">
              {n.body}
            </AppText>
            <AppText size={11} tone="muted">
              {formatTimeAgoFa(n.createdAt)}
            </AppText>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 24 }}>
          <AppText tone="muted" size={14} style={{ textAlign: "center" }}>
            {tab === "unread" ? "همهٔ اعلان‌ها را خوانده‌ای. 👌" : "هنوز اعلانی نداری."}
          </AppText>
        </View>
      }
    />
  );
}
