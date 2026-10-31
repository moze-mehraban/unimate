import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import type { Database } from "@unimate/shared";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set (see apps/mobile/.env.example).");
}

/** The web app, for flows that finish in a browser (password reset links). */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000";

export const supabase = createClient<Database>(url, key, {
  auth: {
    // expo-sqlite's localStorage persists the session on the device.
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // There's no URL to read a session from on Android/iOS.
    detectSessionInUrl: false,
    // OAuth returns a code that we exchange ourselves (see signInWithGoogle).
    flowType: "pkce",
  },
});

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
