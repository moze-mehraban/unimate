import Ionicons from "@expo/vector-icons/Ionicons";
import { Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_700Bold, useFonts } from "@expo-google-fonts/vazirmatn";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, Pressable, type ColorValue } from "react-native";
import { SessionProvider, useSession } from "@/providers/session";
import { FONT, useColors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

// Screens opened directly (web reload, deep/invite links) get the tabs underneath,
// so they have a back button instead of a dead end.
export const unstable_settings = { anchor: "(tabs)" };

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
          // Native RTL flips the back arrow itself. On web I18nManager.isRTL stays false (and the
          // native stack ignores headerBackImage), so draw a right-pointing back button by hand.
          ...(Platform.OS === "web"
            ? {
                headerLeft: ({ canGoBack, tintColor }: { canGoBack?: boolean; tintColor?: ColorValue }) =>
                  canGoBack ? (
                    <Pressable role="button" aria-label="بازگشت" onPress={() => router.back()} style={{ padding: 8 }}>
                      <Ionicons name="arrow-forward" size={22} color={typeof tintColor === "string" ? tintColor : undefined} />
                    </Pressable>
                  ) : null,
              }
            : null),
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
          <Stack.Screen name="classes/new" options={{ title: "افزودن کلاس", presentation: "modal" }} />
          <Stack.Screen name="classes/[id]/index" options={{ title: "کلاس" }} />
          <Stack.Screen name="classes/[id]/info" options={{ title: "اطلاعات کلاس" }} />
          <Stack.Screen name="classes/[id]/settings" options={{ title: "تنظیمات کلاس" }} />
          <Stack.Screen name="classes/[id]/assignments/new" options={{ title: "تکلیف جدید", presentation: "modal" }} />
          <Stack.Screen name="classes/[id]/assignments/[assignmentId]" options={{ title: "ویرایش تکلیف" }} />
        </Stack.Protected>
        {/* Invite links work signed out too: the screen asks to sign in and remembers the token. */}
        <Stack.Screen name="join/[token]" options={{ title: "دعوت به کلاس" }} />
        {/* OAuth lands here (unimate://auth/callback); it only finishes the browser session. */}
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
