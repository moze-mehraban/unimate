import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/lib/theme";
import { AppText, Card } from "./ui";

/** Centered card layout shared by the sign-in screens. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 20 }}>
            <View style={{ alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: c.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText weight="bold" size={22} style={{ color: c.primaryForeground }}>
                  U
                </AppText>
              </View>
              <AppText weight="bold" size={22}>
                {title}
              </AppText>
              {subtitle ? (
                <AppText tone="muted" size={14} style={{ textAlign: "center" }}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <Card style={{ gap: 14 }}>{children}</Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** "──── یا ────" between Google and email sign-in. */
export function OrDivider() {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      <AppText size={12} tone="muted">
        یا
      </AppText>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
    </View>
  );
}
