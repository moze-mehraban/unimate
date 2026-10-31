import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import {
  addDays,
  formatJalaliDay,
  jalaliMonthGrid,
  jalaliOfKey,
  toFaDigits,
  todayKey,
  WEEKDAY_NAMES,
  type DayKey,
} from "@unimate/shared";
import { useColors } from "@/lib/theme";
import { AppText } from "./ui";

/**
 * Jalali month picker in a modal. Rows are Saturday-first; in the RTL layout
 * Saturday sits on the right, as on Iranian calendars. "Previous month" comes
 * first in the row, so it's on the right and its chevron points right.
 */
export function JalaliDatePicker({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: DayKey | null;
  onPick: (day: DayKey) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const today = todayKey();
  const [view, setView] = useState<DayKey>(value ?? today);
  // Re-anchor on the selected day each time the picker opens.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setView(value ?? today);
  }

  const month = jalaliMonthGrid(view);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="بستن"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "#0008", alignItems: "center", justifyContent: "center", padding: 20 }}
      >
        {/* Inner Pressable swallows taps so they don't close the modal. */}
        <Pressable style={{ width: "100%", maxWidth: 360, backgroundColor: c.surface, borderRadius: 16, padding: 14, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <NavButton label="ماه قبل" icon="chevron-forward" onPress={() => setView(addDays(month.first, -1))} />
            <AppText weight="bold">{month.title}</AppText>
            <NavButton label="ماه بعد" icon="chevron-back" onPress={() => setView(addDays(month.last, 1))} />
          </View>

          <View style={{ flexDirection: "row" }}>
            {WEEKDAY_NAMES.map((d) => (
              <AppText key={d} size={12} tone="muted" style={{ flex: 1, textAlign: "center" }}>
                {d.charAt(0)}
              </AppText>
            ))}
          </View>

          {month.weeks.map((week) => (
            <View key={week[0]} style={{ flexDirection: "row" }}>
              {week.map((day) => {
                const inMonth = day >= month.first && day <= month.last;
                const selected = day === value;
                const isToday = day === today;
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityLabel={formatJalaliDay(day)}
                    aria-selected={selected}
                    onPress={() => onPick(day)}
                    style={{
                      flex: 1,
                      height: 40,
                      margin: 1,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected ? c.primary : "transparent",
                      borderWidth: isToday && !selected ? 1 : 0,
                      borderColor: c.primary,
                      opacity: inMonth ? 1 : 0.35,
                    }}
                  >
                    <AppText
                      size={14}
                      weight={selected || isToday ? "bold" : "regular"}
                      style={{ color: selected ? c.primaryForeground : isToday ? c.primary : c.foreground }}
                    >
                      {toFaDigits(jalaliOfKey(day).day)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Pressable onPress={() => setView(today)} style={{ alignSelf: "center", padding: 6 }}>
            <AppText size={13} tone="primary">
              برو به امروز
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NavButton({ label, icon, onPress }: { label: string; icon: "chevron-forward" | "chevron-back"; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={20} color={c.foreground} />
    </Pressable>
  );
}
