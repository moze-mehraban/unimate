import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  CLASS_COLOR_KEYS,
  CLASS_COLORS,
  describeSession,
  GENERIC_ERROR,
  toFaDigits,
  WEEKDAY_NAMES,
  type ClassColor,
  type ClassSession,
} from "@unimate/shared";
import { confirmAsync, notify } from "@/lib/dialogs";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { AppText, Banner, Button, Field, Section, SmallButton } from "./ui";

/** Ten swatches; owner only (RLS). */
export function ColorPicker({ classId, color, onChanged }: { classId: string; color: string; onChanged: () => void }) {
  const c = useColors();
  const [current, setCurrent] = useState(color);

  async function pick(key: ClassColor) {
    const previous = current;
    setCurrent(key);
    const { error } = await supabase.from("classes").update({ color: key }).eq("id", classId);
    if (error) {
      setCurrent(previous);
      notify("ذخیره نشد", GENERIC_ERROR);
    } else onChanged();
  }

  return (
    <Section title="رنگ کلاس">
      <View role="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CLASS_COLOR_KEYS.map((key) => (
          <Pressable
            key={key}
            role="radio"
            aria-checked={current === key}
            aria-label={CLASS_COLORS[key].label}
            onPress={() => pick(key)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: CLASS_COLORS[key].hex,
              borderWidth: current === key ? 3 : 0,
              borderColor: c.foreground,
            }}
          />
        ))}
      </View>
    </Section>
  );
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Hour/minute steppers: hours 0–23, minutes in quarters. */
function TimeStepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const c = useColors();
  const [h, m] = value.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const set = (hour: number, minute: number) => onChange(`${pad((hour + 24) % 24)}:${pad((minute + 60) % 60)}`);
  const btn = (text: string, onPress: () => void, a11y: string) => (
    <Pressable role="button" aria-label={a11y} onPress={onPress} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <AppText weight="bold" tone="primary">
        {text}
      </AppText>
    </Pressable>
  );
  return (
    <View style={{ gap: 4 }}>
      <AppText size={13} weight="medium">
        {label}
      </AppText>
      {/* Hours then minutes, left to right like a clock. */}
      <View
        style={{
          flexDirection: "row",
          direction: "ltr",
          alignItems: "center",
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 10,
          alignSelf: "flex-start",
        }}
      >
        {btn("−", () => set(h - 1, m), `${label}: ساعت کمتر`)}
        <AppText weight="medium">{toFaDigits(pad(h))}</AppText>
        {btn("+", () => set(h + 1, m), `${label}: ساعت بیشتر`)}
        <AppText tone="muted">:</AppText>
        {/* Snap to quarters: 40 → 30 down, 40 → 45 up. */}
        {btn("−", () => set(h, m % 15 ? m - (m % 15) : m - 15), `${label}: دقیقه کمتر`)}
        <AppText weight="medium">{toFaDigits(pad(m))}</AppText>
        {btn("+", () => set(h, m + 15 - (m % 15)), `${label}: دقیقه بیشتر`)}
      </View>
    </View>
  );
}

/** Weekly sessions: list with delete, and an add form. Owner only (RLS). */
export function ScheduleEditor({
  classId,
  sessions,
  onChanged,
}: {
  classId: string;
  sessions: ClassSession[];
  onChanged: () => void;
}) {
  const c = useColors();
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:30");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) return setError("ساعت نامعتبر است.");
    if (end <= start) return setError("پایان جلسه باید بعد از شروع آن باشد.");
    setError(null);
    setSaving(true);
    const { error: e } = await supabase
      .from("class_sessions")
      .insert({ class_id: classId, weekday, start_time: start, end_time: end, room: room.trim() });
    setSaving(false);
    if (e) return setError(GENERIC_ERROR);
    setRoom("");
    onChanged();
  }

  async function remove(id: string) {
    if (!(await confirmAsync("حذف جلسه", "این جلسه از برنامهٔ کلاس حذف شود؟", "حذف", true))) return;
    const { error: e } = await supabase.from("class_sessions").delete().eq("id", id);
    if (e) notify("حذف نشد", GENERIC_ERROR);
    onChanged();
  }

  return (
    <Section title="زمان و مکان برگزاری" count={sessions.length}>
      {sessions.length ? (
        sessions.map((s) => (
          <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText size={14} style={{ flex: 1 }}>
              {describeSession(s)}
            </AppText>
            <SmallButton tone="danger" onPress={() => remove(s.id)}>
              حذف
            </SmallButton>
          </View>
        ))
      ) : (
        <AppText size={13} tone="muted">
          هنوز جلسه‌ای ثبت نشده.
        </AppText>
      )}

      <View style={{ gap: 10 }}>
        {error ? <Banner kind="error">{error}</Banner> : null}
        <AppText size={13} weight="medium">
          روز
        </AppText>
        {/* Seven days don't fit one row on a phone; wrap them. */}
        <View role="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {WEEKDAY_NAMES.map((day, i) => {
            const selected = weekday === i;
            return (
              <Pressable
                key={day}
                role="radio"
                aria-checked={selected}
                onPress={() => setWeekday(i)}
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
                  {day}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <TimeStepper label="شروع" value={start} onChange={setStart} />
          <TimeStepper label="پایان" value={end} onChange={setEnd} />
        </View>
        <Field label="اتاق / مکان" value={room} onChangeText={setRoom} maxLength={80} placeholder="مثلاً ۲۰۳ یا آزمایشگاه شبکه" />
        <Button onPress={add} loading={saving}>
          افزودن جلسه
        </Button>
      </View>
    </Section>
  );
}
