import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { toFaDigits } from "@unimate/shared";
import { useColors } from "@/lib/theme";
import { AppText } from "./ui";

/**
 * The OS time picker in wheel ("spinner") mode: on iOS it's the same rotary
 * wheel as the Alarm app. Android shows it as a dialog. `value` is "HH:mm".
 */
export function TimePicker({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [h, m] = value.split(":").map(Number);
  // Only the wall-clock hour/minute matter, so a local Date is fine.
  const date = new Date(2000, 0, 1, h, m);

  function handle(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "set" && picked) {
      onChange(`${String(picked.getHours()).padStart(2, "0")}:${String(picked.getMinutes()).padStart(2, "0")}`);
    }
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ساعت"
        disabled={disabled}
        onPress={() => setOpen((o) => !o)}
        style={{
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: c.surface,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <AppText weight="medium" style={{ writingDirection: "ltr" }}>
          {toFaDigits(value)}
        </AppText>
      </Pressable>
      {open && !disabled ? (
        <DateTimePicker value={date} mode="time" display="spinner" is24Hour locale="fa-IR" onChange={handle} />
      ) : null}
    </View>
  );
}
