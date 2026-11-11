import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import {
  addDays,
  classColorHex,
  dayKeyOf,
  describeSession,
  formatDayTitle,
  jalaliMonthGrid,
  jalaliOfKey,
  sessionsOnDay,
  toFaDigits,
  todayKey,
  WEEKDAY_NAMES,
  weekdayIndex,
  type DayKey,
  type TaskStatus,
} from "@unimate/shared";
import { AppText, Loading, Segmented } from "@/components/ui";
import { WorkCard } from "@/components/work-card";
import { fetchMySessions, type MySession } from "@/lib/classes";
import { notify } from "@/lib/dialogs";
import { refreshReminders } from "@/lib/phone-notifications";
import { useColors, type Colors } from "@/lib/theme";
import { fetchMyWork, setWorkStatus, type WorkItem } from "@/lib/work";
import { useUserId } from "@/providers/session";

type CalendarView = "month" | "week";

/** All, personal tasks only, or one class. */
type Source = "all" | "personal" | string;

function weekOf(key: DayKey): DayKey[] {
  const start = addDays(key, -weekdayIndex(key));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Dot color for a day's item: overdue red, done gray, else the class color (personal tasks: primary). */
function dotColor(c: Colors, item: WorkItem) {
  if (item.status === "done") return c.border;
  if (item.due.state === "overdue") return c.danger;
  return item.kind === "assignment" ? classColorHex(item.classColor) : c.primary;
}

export default function CalendarScreen() {
  const c = useColors();
  const userId = useUserId();
  const [items, setItems] = useState<WorkItem[] | null>(null);
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<CalendarView>("month");
  const [today, setToday] = useState<DayKey>(() => todayKey());
  const [selected, setSelected] = useState<DayKey>(today);
  const [source, setSource] = useState<Source>("all");

  const load = useCallback(async () => {
    try {
      const [work, mySessions] = await Promise.all([fetchMyWork(), fetchMySessions()]);
      setItems(work);
      setSessions(mySessions);
      setToday(todayKey());
    } catch {
      notify("خطا", "بارگذاری کارها انجام نشد.");
      setItems((list) => list ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function changeStatus(item: WorkItem, status: TaskStatus) {
    const previous = item.status;
    const swap = (s: TaskStatus) =>
      setItems((list) => list?.map((i) => (i.id === item.id && i.kind === item.kind ? { ...i, status: s } : i)) ?? null);
    swap(status);
    try {
      await setWorkStatus(item, status, userId);
      // A done assignment no longer needs its deadline reminder (and vice versa).
      refreshReminders(userId);
    } catch {
      swap(previous);
      notify("ذخیره نشد", "وضعیت ذخیره نشد. دوباره تلاش کن.");
    }
  }

  if (!items) return <Loading />;

  // Filter chips: every class with assignments or sessions.
  const classes = [
    ...new Map([
      ...items.flatMap((i) => (i.kind === "assignment" ? [[i.classId, i.courseName] as const] : [])),
      ...sessions.map((s) => [s.class_id, s.courseName] as const),
    ]).entries(),
  ];
  const filtered = items.filter((i) =>
    source === "all" ? true : source === "personal" ? i.kind === "task" : i.kind === "assignment" && i.classId === source,
  );
  const shownSessions = source === "all" ? sessions : sessions.filter((s) => s.class_id === source);
  const byDay = new Map<DayKey, WorkItem[]>();
  for (const item of filtered) {
    if (!item.dueAt) continue;
    const key = dayKeyOf(item.dueAt);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }

  const month = jalaliMonthGrid(selected);
  const week = weekOf(selected);
  const title =
    view === "month"
      ? month.title
      : `${toFaDigits(jalaliOfKey(week[0]).day)} تا ${formatDayTitle(week[6]).split(" ").slice(1).join(" ")}`;
  const step = (dir: 1 | -1) =>
    setSelected(view === "month" ? (dir < 0 ? addDays(month.first, -1) : addDays(month.last, 1)) : addDays(selected, dir * 7));

  const renderCards = (list: WorkItem[]) =>
    list.map((item) => (
      <WorkCard
        key={`${item.kind}-${item.id}`}
        item={item}
        onStatus={(s) => changeStatus(item, s)}
        onPress={
          item.kind === "task"
            ? () => router.push(`/tasks/${item.id}`)
            : () => router.push(`/classes/${item.classId}`)
        }
      />
    ));

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={c.primary}
        />
      }
    >
      {/* RTL: "previous" comes first, so it sits on the right and points right. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <IconButton label={view === "month" ? "ماه قبل" : "هفتهٔ قبل"} icon="chevron-forward" onPress={() => step(-1)} />
        <IconButton label={view === "month" ? "ماه بعد" : "هفتهٔ بعد"} icon="chevron-back" onPress={() => step(1)} />
        <AppText weight="bold" size={17} style={{ flexShrink: 1 }}>
          {title}
        </AppText>
        <View style={{ flex: 1 }} />
        <Pressable
          role="button"
          onPress={() => setSelected(today)}
          style={{ borderColor: c.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}
        >
          <AppText size={13}>امروز</AppText>
        </Pressable>
      </View>

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "month", label: "ماهانه" },
          { value: "week", label: "هفتگی" },
        ]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {[
          { value: "all", label: "همه" },
          ...classes.map(([id, name]) => ({ value: id, label: name })),
          { value: "personal", label: "کارهای شخصی" },
        ].map((o) => (
          <Pressable
            key={o.value}
            role="button"
            aria-pressed={source === o.value}
            onPress={() => setSource(o.value)}
            style={{
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: source === o.value ? c.primary : c.border,
              backgroundColor: source === o.value ? `${c.primary}1a` : "transparent",
            }}
          >
            <AppText size={13} tone={source === o.value ? "primary" : "muted"}>
              {o.label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {view === "month" ? (
        <>
          <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: 6 }}>
            <View style={{ flexDirection: "row" }}>
              {WEEKDAY_NAMES.map((d) => (
                <AppText key={d} size={12} tone="muted" style={{ flex: 1, textAlign: "center" }}>
                  {d.charAt(0)}
                </AppText>
              ))}
            </View>
            {month.weeks.map((days) => (
              <View key={days[0]} style={{ flexDirection: "row" }}>
                {days.map((day) => {
                  const inMonth = day >= month.first && day <= month.last;
                  const dayItems = byDay.get(day) ?? [];
                  const daySessions = sessionsOnDay(shownSessions, day);
                  const isSelected = day === selected;
                  const isToday = day === today;
                  return (
                    <Pressable
                      key={day}
                      role="button"
                      aria-label={`${formatDayTitle(day)}${daySessions.length ? ` — ${toFaDigits(daySessions.length)} جلسه` : ""}${
                        dayItems.length ? ` — ${toFaDigits(dayItems.length)} کار` : ""
                      }`}
                      aria-selected={isSelected}
                      onPress={() => setSelected(day)}
                      style={{
                        flex: 1,
                        height: 50,
                        margin: 1,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 3,
                        backgroundColor: isSelected ? `${c.primary}1a` : "transparent",
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: c.primary,
                        opacity: inMonth ? 1 : 0.35,
                      }}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isToday ? c.primary : "transparent",
                        }}
                      >
                        <AppText
                          size={13}
                          weight={isToday ? "bold" : "regular"}
                          style={{ color: isToday ? c.primaryForeground : c.foreground, lineHeight: 18 }}
                        >
                          {toFaDigits(jalaliOfKey(day).day)}
                        </AppText>
                      </View>
                      {/* Hollow dots = class sessions, filled = work; three at most. */}
                      <View style={{ flexDirection: "row", gap: 2, height: 5 }}>
                        {daySessions.slice(0, 3).map((s) => (
                          <View
                            key={s.id}
                            style={{ width: 5, height: 5, borderRadius: 3, borderWidth: 1.2, borderColor: classColorHex(s.color) }}
                          />
                        ))}
                        {dayItems.slice(0, Math.max(0, 3 - daySessions.length)).map((item) => (
                          <View
                            key={`${item.kind}-${item.id}`}
                            style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dotColor(c, item) }}
                          />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <DayAgenda
            day={selected}
            today={today}
            items={byDay.get(selected) ?? []}
            sessions={sessionsOnDay(shownSessions, selected)}
            renderCards={renderCards}
          />
        </>
      ) : (
        week.map((day) => (
          <DayAgenda
            key={day}
            day={day}
            today={today}
            items={byDay.get(day) ?? []}
            sessions={sessionsOnDay(shownSessions, day)}
            renderCards={renderCards}
          />
        ))
      )}

      {filtered.some((i) => !i.dueAt && i.status !== "done") ? (
        <AppText size={12} tone="muted">
          {toFaDigits(filtered.filter((i) => !i.dueAt && i.status !== "done").length)} کار بدون مهلت در تقویم نیست — در «کارهای من» ببین.
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function DayAgenda({
  day,
  today,
  items,
  sessions,
  renderCards,
}: {
  day: DayKey;
  today: DayKey;
  items: WorkItem[];
  sessions: MySession[];
  renderCards: (items: WorkItem[]) => React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText weight="bold" size={14}>
          {formatDayTitle(day)}
        </AppText>
        {day === today ? (
          <View style={{ backgroundColor: `${c.primary}1a`, borderRadius: 999, paddingHorizontal: 8 }}>
            <AppText size={11} tone="primary">
              امروز
            </AppText>
          </View>
        ) : null}
      </View>
      {sessions.map((s) => (
        <Pressable
          key={s.id}
          role="button"
          onPress={() => router.push(`/classes/${s.class_id}`)}
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            borderStartWidth: 5,
            borderStartColor: classColorHex(s.color),
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <AppText weight="bold" size={14}>
            {s.courseName}
          </AppText>
          <AppText size={13} tone="muted">
            {describeSession(s, false)}
          </AppText>
        </Pressable>
      ))}
      {items.length ? (
        renderCards(items)
      ) : sessions.length ? null : (
        <View style={{ backgroundColor: c.surface, borderRadius: 10, padding: 12 }}>
          <AppText size={13} tone="muted">
            برنامه‌ای برای این روز ثبت نشده.
          </AppText>
        </View>
      )}
    </View>
  );
}

function IconButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: "chevron-forward" | "chevron-back";
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        borderColor: c.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={18} color={c.foreground} />
    </Pressable>
  );
}
