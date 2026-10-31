import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { toFaDigits } from "@unimate/shared";
import { Fab } from "@/components/fab";
import { AppText, Banner, Loading } from "@/components/ui";
import { fetchMyClasses, type ClassSummary } from "@/lib/classes";
import { useColors } from "@/lib/theme";
import { useUserId } from "@/providers/session";

export default function ClassesScreen() {
  const c = useColors();
  const userId = useUserId();
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setClasses(await fetchMyClasses(userId));
      setError(null);
    } catch {
      setError("بارگذاری کلاس‌ها انجام نشد. دوباره بکش.");
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!classes && !error) return <Loading />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={classes ?? []}
        keyExtractor={(cl) => cl.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={c.primary}
          />
        }
        ListHeaderComponent={error ? <Banner kind="error">{error}</Banner> : undefined}
        renderItem={({ item }) => (
          <Pressable
            role="button"
            onPress={() => router.push(`/classes/${item.id}`)}
            style={({ pressed }) => ({
              backgroundColor: c.surface,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
              gap: 4,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppText weight="bold" style={{ flexShrink: 1 }}>
                {item.course_name}
              </AppText>
              {item.isOwner ? (
                <View style={{ backgroundColor: `${c.primary}1a`, borderRadius: 999, paddingHorizontal: 8 }}>
                  <AppText size={11} tone="primary">
                    سازنده
                  </AppText>
                </View>
              ) : null}
              {/* Spacer: react-native-web ignores marginStart: "auto". */}
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-back" size={18} color={c.muted} />
            </View>
            <AppText size={13} tone="muted">
              {[item.instructor_name && `استاد: ${item.instructor_name}`, item.term, `${toFaDigits(item.memberCount)} عضو`]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 24 }}>
            <AppText tone="muted" size={14} style={{ textAlign: "center" }}>
              هنوز عضو هیچ کلاسی نیستی. با دکمهٔ + یک کلاس بساز یا با لینک دعوت به کلاس هم‌کلاسی‌هایت بپیوند.
            </AppText>
          </View>
        }
      />
      <Fab label="کلاس جدید یا پیوستن با لینک دعوت" onPress={() => router.push("/classes/new")} />
    </View>
  );
}
