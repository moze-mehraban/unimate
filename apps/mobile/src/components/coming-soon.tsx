import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { useColors } from "@/lib/theme";
import { AppText } from "./ui";

/** Placeholder for tabs built in later parts of step 7. */
export function ComingSoon({ icon, title, text }: { icon: ComponentProps<typeof Ionicons>["name"]; title: string; text: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
      <Ionicons name={icon} size={40} color={c.muted} />
      <AppText weight="bold">{title}</AppText>
      <AppText tone="muted" size={14} style={{ textAlign: "center" }}>
        {text}
      </AppText>
    </View>
  );
}
