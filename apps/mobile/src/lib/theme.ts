import { useColorScheme } from "react-native";

// Same tokens as the web app (apps/web/src/app/globals.css).
const light = {
  background: "#f6f7fb",
  surface: "#ffffff",
  foreground: "#171a23",
  muted: "#646b7d",
  border: "#e3e6ee",
  primary: "#4f46e5",
  primaryForeground: "#ffffff",
  danger: "#c2271d",
  dangerSoft: "#fdecea",
  success: "#17803d",
  successSoft: "#e7f6ec",
};

const dark: typeof light = {
  background: "#0e1017",
  surface: "#171a24",
  foreground: "#eceef4",
  muted: "#9aa1b2",
  border: "#2a2e3b",
  primary: "#818cf8",
  primaryForeground: "#0e1017",
  danger: "#f87171",
  dangerSoft: "#3b1715",
  success: "#4ade80",
  successSoft: "#12301d",
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

/** Vazirmatn has no synthetic bold in React Native; each weight is its own family. */
export const FONT = {
  regular: "Vazirmatn_400Regular",
  medium: "Vazirmatn_500Medium",
  bold: "Vazirmatn_700Bold",
} as const;
