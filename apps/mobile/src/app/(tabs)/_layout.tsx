import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useEffect, type ComponentProps } from "react";
import { AppState, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { takePendingInvite } from "@/lib/pending-invite";
import { refreshReminders, registerPushToken } from "@/lib/phone-notifications";
import { useNotificationTaps } from "@/lib/use-notification-taps";
import { NotificationsProvider, useNotifications } from "@/providers/notifications";
import { useUserId } from "@/providers/session";
import { toFaDigits } from "@unimate/shared";
import { FONT, useColors } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    // Our tint colors are plain strings.
    return <Ionicons name={focused ? focusedName : name} size={size} color={typeof color === "string" ? color : undefined} />;
  };
}

export default function TabsLayout() {
  return (
    <NotificationsProvider>
      <TabsNavigator />
    </NotificationsProvider>
  );
}

function TabsNavigator() {
  const c = useColors();
  const { unread, version } = useNotifications();
  const insets = useSafeAreaInsets();
  const userId = useUserId();

  // Phone notifications: register for push once, and keep the local reminders in step
  // with the data — on start, whenever the app comes back to the front, and when a
  // realtime notification says something changed (e.g. a new assignment).
  useEffect(() => {
    registerPushToken();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshReminders(userId);
    });
    return () => sub.remove();
  }, [userId]);
  useEffect(() => {
    refreshReminders(userId);
  }, [userId, version]);
  useNotificationTaps();

  // Back to the invite that sent a signed-out user to sign in. This layout mounts
  // only after Stack.Protected has switched to the signed-in screens; pushing from
  // the root layout raced that reset and landed on "/?token=…".
  useEffect(() => {
    const token = takePendingInvite();
    if (token) router.push(`/join/${token}`);
  }, []);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        // Vazirmatn needs more line height than the default bar leaves, or labels get clipped.
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: FONT.medium, fontSize: 11, lineHeight: 18 },
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.foreground,
        headerTitleStyle: { fontFamily: FONT.bold },
        headerTitleAlign: "center",
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "کارهای من", tabBarIcon: icon("checkbox-outline", "checkbox") }} />
      <Tabs.Screen name="calendar" options={{ title: "تقویم", tabBarIcon: icon("calendar-outline", "calendar") }} />
      <Tabs.Screen name="classes" options={{ title: "کلاس‌ها", tabBarIcon: icon("school-outline", "school") }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "اعلان‌ها",
          tabBarIcon: icon("notifications-outline", "notifications"),
          tabBarBadge: unread ? (unread > 99 ? "۹۹+" : toFaDigits(unread)) : undefined,
          tabBarBadgeStyle: { backgroundColor: c.danger, color: c.primaryForeground, fontFamily: FONT.bold, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "پروفایل", tabBarIcon: icon("person-outline", "person") }} />
    </Tabs>
  );
}
