import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { toFaDigits, type TaskStatus } from "@unimate/shared";
import { AppText, Banner, Loading, Segmented } from "@/components/ui";
import { WorkCard } from "@/components/work-card";
import { notify } from "@/lib/dialogs";
import { useColors } from "@/lib/theme";
import { fetchMyWork, setWorkStatus, type WorkItem } from "@/lib/work";
import { useUserId } from "@/providers/session";

type Tab = "active" | "done" | "all";

export default function MyWorkScreen() {
  const c = useColors();
  const userId = useUserId();
  const [items, setItems] = useState<WorkItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  const load = useCallback(async () => {
    try {
      setItems(await fetchMyWork());
      setError(null);
    } catch {
      setError("بارگذاری کارها انجام نشد. اتصال را بررسی کن و دوباره بکش.");
    }
  }, []);

  // Reload whenever the tab comes back into view (e.g. after adding a task).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function changeStatus(item: WorkItem, status: TaskStatus) {
    // Optimistic: switch now, roll back if the save fails.
    const previous = item.status;
    setItems((list) => list?.map((i) => (i.id === item.id && i.kind === item.kind ? { ...i, status } : i)) ?? null);
    try {
      await setWorkStatus(item, status, userId);
    } catch {
      setItems((list) => list?.map((i) => (i.id === item.id && i.kind === item.kind ? { ...i, status: previous } : i)) ?? null);
      notify("ذخیره نشد", "وضعیت ذخیره نشد. دوباره تلاش کن.");
    }
  }

  if (!items && !error) return <Loading />;

  const all = items ?? [];
  const remaining = all.filter((i) => i.status !== "done");
  const visible = tab === "all" ? all : tab === "done" ? all.filter((i) => i.status === "done") : remaining;
  const stats = [
    { label: "باقی‌مانده", value: remaining.length },
    { label: "عقب‌افتاده", value: remaining.filter((i) => i.due.state === "overdue").length, danger: true },
    { label: "در حال انجام", value: remaining.filter((i) => i.status === "in_progress").length },
    { label: "تکمیل‌شده", value: all.length - remaining.length },
  ];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visible}
        keyExtractor={(i) => `${i.kind}-${i.id}`}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            {error ? <Banner kind="error">{error}</Banner> : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {stats.map((s) => (
                <View
                  key={s.label}
                  style={{ flex: 1, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 10 }}
                >
                  <AppText weight="bold" size={20} tone={s.danger && s.value ? "danger" : "foreground"}>
                    {toFaDigits(s.value)}
                  </AppText>
                  <AppText size={11} tone="muted">
                    {s.label}
                  </AppText>
                </View>
              ))}
            </View>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "active", label: "باقی‌مانده" },
                { value: "done", label: "تکمیل‌شده" },
                { value: "all", label: "همه" },
              ]}
            />
          </View>
        }
        renderItem={({ item }) => (
          <WorkCard
            item={item}
            onStatus={(s) => changeStatus(item, s)}
            onPress={item.kind === "task" ? () => router.push({ pathname: "/tasks/[id]", params: { id: item.id } }) : undefined}
          />
        )}
        ListEmptyComponent={
          <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 24, alignItems: "center" }}>
            <AppText tone="muted" size={14} style={{ textAlign: "center" }}>
              {all.length === 0
                ? "هنوز کاری نداری. به یک کلاس بپیوند یا یک کار شخصی اضافه کن."
                : tab === "done"
                  ? "هنوز چیزی را تکمیل نکرده‌ای."
                  : "همه‌چیز انجام شده! 🎉"}
            </AppText>
          </View>
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="کار شخصی جدید"
        onPress={() => router.push("/tasks/new")}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: 20,
          end: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        })}
      >
        <Ionicons name="add" size={28} color={c.primaryForeground} />
      </Pressable>
    </View>
  );
}
