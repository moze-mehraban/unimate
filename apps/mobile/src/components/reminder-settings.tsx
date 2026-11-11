import { useState } from "react";
import { Pressable, View } from "react-native";
import { CLASS_REMINDER_OPTIONS, DEADLINE_REMINDER_OPTIONS, GENERIC_ERROR } from "@unimate/shared";
import { notify } from "@/lib/dialogs";
import { refreshReminders } from "@/lib/phone-notifications";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { AppText, Card } from "./ui";

type Field = "class_reminder_minutes" | "deadline_reminder_hours";

/** Lead times for reminder notifications; each tap saves (null = off). */
export function ReminderSettings({
  userId,
  classMinutes,
  deadlineHours,
}: {
  userId: string;
  classMinutes: number | null;
  deadlineHours: number | null;
}) {
  const [values, setValues] = useState({ class_reminder_minutes: classMinutes, deadline_reminder_hours: deadlineHours });

  async function pick(field: Field, value: number | null) {
    const previous = values[field];
    setValues((v) => ({ ...v, [field]: value }));
    const patch =
      field === "class_reminder_minutes" ? { class_reminder_minutes: value } : { deadline_reminder_hours: value };
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) {
      setValues((v) => ({ ...v, [field]: previous }));
      notify("ذخیره نشد", GENERIC_ERROR);
    } else refreshReminders(userId);
  }

  return (
    <Card style={{ gap: 14 }}>
      <View>
        <AppText weight="bold">یادآوری‌ها</AppText>
        <AppText size={13} tone="muted">
          قبل از شروع جلسه‌های کلاس‌هایت و قبل از مهلت تکالیفی که تمامشان نکرده‌ای، اعلان می‌گیری.
        </AppText>
      </View>
      <Options
        label="قبل از شروع کلاس"
        options={CLASS_REMINDER_OPTIONS}
        value={values.class_reminder_minutes}
        onPick={(v) => pick("class_reminder_minutes", v)}
      />
      <Options
        label="قبل از مهلت تکلیف"
        options={DEADLINE_REMINDER_OPTIONS}
        value={values.deadline_reminder_hours}
        onPick={(v) => pick("deadline_reminder_hours", v)}
      />
    </Card>
  );
}

function Options({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { value: number | null; label: string }[];
  value: number | null;
  onPick: (value: number | null) => void;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <AppText size={14} weight="medium">
        {label}
      </AppText>
      <View role="radiogroup" aria-label={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.label}
              role="radio"
              aria-checked={selected}
              onPress={() => onPick(o.value)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: selected ? c.primary : c.border,
                backgroundColor: selected ? `${c.primary}1a` : "transparent",
              }}
            >
              <AppText size={13} tone={selected ? "primary" : "muted"}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
