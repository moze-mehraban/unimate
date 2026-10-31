import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";
import { toFaDigits } from "@unimate/shared";
import { useColors } from "@/lib/theme";
import { AppText } from "./ui";

// The native picker module has no web build; the web preview gets simple steppers.

const pad = (n: number) => String(n).padStart(2, "0");

export function TimePicker({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [h, m] = value.split(":").map(Number);
  const set = (hour: number, minute: number) => onChange(`${pad((hour + 24) % 24)}:${pad((minute + 60) % 60)}`);
  return (
    // Hours then minutes, left to right like a clock.
    <View style={{ flexDirection: "row", direction: "ltr", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1 }}>
      <Stepper label="ساعت" value={h} onStep={(d) => set(h + d, m)} disabled={disabled} />
      <AppText weight="bold">:</AppText>
      {/* Snap to 5-minute marks: 59 → 55 down, 57 → 00 up. */}
      <Stepper label="دقیقه" value={m} onStep={(d) => set(h, d > 0 ? m + 5 - (m % 5) : m - (m % 5 || 5))} disabled={disabled} />
    </View>
  );
}

function Stepper({ label, value, onStep, disabled }: { label: string; value: number; onStep: (delta: 1 | -1) => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <View
      accessibilityLabel={label}
      style={{ alignItems: "center", borderColor: c.border, borderWidth: 1, borderRadius: 10, backgroundColor: c.surface }}
    >
      <Pressable accessibilityLabel={`${label} بیشتر`} disabled={disabled} onPress={() => onStep(1)} style={{ paddingHorizontal: 10 }}>
        <Ionicons name="chevron-up" size={16} color={c.muted} />
      </Pressable>
      <AppText weight="medium">{toFaDigits(pad(value))}</AppText>
      <Pressable accessibilityLabel={`${label} کمتر`} disabled={disabled} onPress={() => onStep(-1)} style={{ paddingHorizontal: 10 }}>
        <Ionicons name="chevron-down" size={16} color={c.muted} />
      </Pressable>
    </View>
  );
}
