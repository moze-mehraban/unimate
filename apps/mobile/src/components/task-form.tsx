import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import {
  addDays,
  ASSIGNMENT_LIMITS,
  formatDeadlineFa,
  formatJalaliDay,
  fromTehranLocal,
  PRIORITIES,
  todayKey,
  type DayKey,
  type Priority,
} from "@unimate/shared";
import { PRIORITY_TEXT, priorityColors } from "@/lib/labels";
import { useColors } from "@/lib/theme";
import { JalaliDatePicker } from "./jalali-date-picker";
import { TimePicker } from "./time-picker";
import { AppText, Banner, Button, Field, Segmented } from "./ui";

export type TaskValues = { title: string; description: string; dueLocal: string; priority: Priority };
export type TaskRow = { title: string; description: string; due_at: string | null; priority: Priority };

const DEFAULT_TIME = "23:59";

/** Title, description, Jalali deadline + time, priority. Same fields and limits as the web form. */
export function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  initial?: TaskValues;
  submitLabel: string;
  /** Returns an error message, or null on success. */
  onSubmit: (row: TaskRow) => Promise<string | null>;
  onDelete?: () => void;
}) {
  const c = useColors();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState<DayKey | null>(initial?.dueLocal ? initial.dueLocal.slice(0, 10) : null);
  const [time, setTime] = useState(initial?.dueLocal ? initial.dueLocal.slice(11, 16) : DEFAULT_TIME);
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dueAt = date ? fromTehranLocal(`${date}T${time}`) : null;
  const prio = priorityColors(c);

  async function submit() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "عنوان را وارد کنید.";
    else if (title.trim().length > ASSIGNMENT_LIMITS.title) next.title = "عنوان خیلی طولانی است.";
    if (description.length > ASSIGNMENT_LIMITS.description) next.description = "توضیحات خیلی طولانی است.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setFormError(null);
    const error = await onSubmit({ title: title.trim(), description: description.trim(), due_at: dueAt, priority });
    setSaving(false);
    if (error) setFormError(error);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {formError ? <Banner kind="error">{formError}</Banner> : null}
        <Field
          label="عنوان"
          value={title}
          onChangeText={setTitle}
          error={errors.title}
          maxLength={ASSIGNMENT_LIMITS.title}
          placeholder="مثلاً مرور فصل ۴ برای میان‌ترم"
        />
        <Field
          label="توضیحات"
          value={description}
          onChangeText={setDescription}
          error={errors.description}
          maxLength={ASSIGNMENT_LIMITS.description}
          placeholder="جزئیات، یادداشت، لینک منابع…"
          multiline
        />

        <View style={{ gap: 8 }}>
          <AppText weight="medium" size={14}>
            مهلت
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="انتخاب تاریخ"
              onPress={() => setPickerOpen(true)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: c.surface,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={c.muted} />
              <AppText tone={date ? "foreground" : "muted"}>{date ? formatJalaliDay(date) : "انتخاب تاریخ"}</AppText>
            </Pressable>
            <TimePicker value={time} onChange={setTime} disabled={!date} />
            {date ? (
              <Pressable accessibilityRole="button" accessibilityLabel="حذف مهلت" onPress={() => setDate(null)} style={{ padding: 6 }}>
                <Ionicons name="close-circle-outline" size={22} color={c.muted} />
              </Pressable>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "امروز", days: 0 },
              { label: "فردا", days: 1 },
              { label: "یک هفته بعد", days: 7 },
            ].map((q) => (
              <Pressable
                key={q.label}
                onPress={() => setDate(addDays(todayKey(), q.days))}
                style={{ borderColor: c.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}
              >
                <AppText size={12} tone="muted">
                  {q.label}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText size={12} tone="muted">
            {dueAt ? `${formatDeadlineFa(dueAt)} (به وقت تهران)` : "اختیاری — به وقت تهران"}
          </AppText>
        </View>

        <View style={{ gap: 8 }}>
          <AppText weight="medium" size={14}>
            اولویت
          </AppText>
          <Segmented
            value={priority}
            onChange={setPriority}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_TEXT[p] }))}
            activeColors={prio}
          />
        </View>

        <Button onPress={submit} loading={saving}>
          {submitLabel}
        </Button>
        {onDelete ? (
          <Button variant="danger" onPress={onDelete}>
            حذف کار
          </Button>
        ) : null}
      </ScrollView>

      <JalaliDatePicker
        visible={pickerOpen}
        value={date}
        onClose={() => setPickerOpen(false)}
        onPick={(day) => {
          setDate(day);
          setPickerOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}
