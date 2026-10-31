import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { FONT, useColors } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    // Our tint colors are plain strings.
    return <Ionicons name={focused ? focusedName : name} size={size} color={typeof color === "string" ? color : undefined} />;
  };
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: FONT.medium, fontSize: 11 },
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
        options={{ title: "اعلان‌ها", tabBarIcon: icon("notifications-outline", "notifications") }}
      />
      <Tabs.Screen name="profile" options={{ title: "پروفایل", tabBarIcon: icon("person-outline", "person") }} />
    </Tabs>
  );
}
