import { Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_700Bold, useFonts } from "@expo-google-fonts/vazirmatn";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SessionProvider, useSession } from "@/providers/session";
import { FONT, useColors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

// Native RTL comes from expo-localization's forcesRTL (app.json); the web build needs dir="rtl".
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "fa";
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_700Bold });
  return (
    <SessionProvider>
      <RootNavigator ready={fontsLoaded} />
    </SessionProvider>
  );
}

function RootNavigator({ ready }: { ready: boolean }) {
  const { session, loading } = useSession();
  const c = useColors();
  const done = ready && !loading;

  useEffect(() => {
    if (done) SplashScreen.hideAsync();
  }, [done]);

  if (!done) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.foreground,
          headerTitleStyle: { fontFamily: FONT.bold },
          headerTitleAlign: "center",
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ title: "ثبت‌نام" }} />
          <Stack.Screen name="forgot-password" options={{ title: "فراموشی رمز عبور" }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="tasks/new" options={{ title: "کار شخصی جدید", presentation: "modal" }} />
          <Stack.Screen name="tasks/[id]" options={{ title: "ویرایش کار شخصی" }} />
        </Stack.Protected>
        {/* OAuth lands here (unimate://auth/callback); it only finishes the browser session. */}
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
