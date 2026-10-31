import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useEffect, type ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { takePendingInvite } from "@/lib/pending-invite";
import { NotificationsProvider, useNotifications } from "@/providers/notifications";
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
  const { unread } = useNotifications();
  const insets = useSafeAreaInsets();

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
