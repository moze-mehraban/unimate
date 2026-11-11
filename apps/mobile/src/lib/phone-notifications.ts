import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  addDays,
  describeNotification,
  formatDeadlineFa,
  fromTehranLocal,
  sessionsOnDay,
  todayKey,
} from "@unimate/shared";
import { fetchMySessions } from "./classes";
import { supabase } from "./supabase";
import { fetchMyWork } from "./work";

// Notifications on the phone itself (shown even when the app is closed):
// - reminders before class sessions and deadlines are scheduled locally from what
//   the app knows (no server, works without Google);
// - event notifications (new assignment, join requests…) arrive through FCM, when
//   Firebase is configured (google-services.json) — see docs/PUSH_NOTIFICATIONS.md.

const CHANNEL = "default";
/** How far ahead reminders are scheduled; refreshed every time the app comes to the front. */
const HORIZON_DAYS = 7;

const supported = Platform.OS === "android" || Platform.OS === "ios";

// Show notifications that arrive while the app is open, too.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let permission: Promise<boolean> | null = null;

/** Channel + permission, once per app run. Android 13+ shows the system prompt the first time. */
function ensurePermission(): Promise<boolean> {
  permission ??= (async () => {
    if (!supported) return false;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "اعلان‌ها و یادآوری‌ها",
        // Re-exported via `export *` from a *.types module, which eslint-plugin-import
        // doesn't follow; it exists at runtime (build/NotificationChannelManager.types.js).
        // eslint-disable-next-line import/namespace
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  })();
  return permission;
}

/**
 * Replaces the scheduled reminders with the next HORIZON_DAYS of class sessions and
 * deadlines, per the user's reminder settings. Done assignments are skipped.
 */
export async function rescheduleReminders(userId: string): Promise<void> {
  if (!(await ensurePermission())) return;

  const [{ data: profile }, sessions, work] = await Promise.all([
    supabase.from("profiles").select("class_reminder_minutes, deadline_reminder_hours").eq("id", userId).single(),
    fetchMySessions(),
    fetchMyWork(),
  ]);
  const classMinutes = profile?.class_reminder_minutes ?? null;
  const deadlineHours = profile?.deadline_reminder_hours ?? null;

  const now = Date.now();
  const until = now + HORIZON_DAYS * 86_400_000;
  const reminders: { at: number; title: string; body: string; url: string }[] = [];

  if (classMinutes !== null) {
    for (let d = 0; d <= HORIZON_DAYS; d++) {
      const day = addDays(todayKey(now), d);
      for (const s of sessionsOnDay(sessions, day)) {
        const startsAt = fromTehranLocal(`${day}T${s.start_time.slice(0, 5)}`);
        if (!startsAt) continue;
        const at = new Date(startsAt).getTime() - classMinutes * 60_000;
        if (at <= now || at > until) continue;
        const text = describeNotification(
          "class_starting",
          s.class_id,
          { course_name: s.courseName, start_time: s.start_time.slice(0, 5), room: s.room },
          formatDeadlineFa,
        );
        reminders.push({ at, ...text, url: text.href });
      }
    }
  }

  if (deadlineHours !== null) {
    for (const item of work) {
      if (item.kind !== "assignment" || item.status === "done" || !item.dueAt) continue;
      const at = new Date(item.dueAt).getTime() - deadlineHours * 3_600_000;
      if (at <= now || at > until) continue;
      const text = describeNotification(
        "assignment_due_soon",
        item.classId,
        { assignment_id: item.id, title: item.title, due_at: item.dueAt, course_name: item.courseName },
        formatDeadlineFa,
      );
      reminders.push({ at, ...text, url: text.href });
    }
  }

  // Only our reminders are ever scheduled, so start from a clean slate.
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, data: { url: r.url } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: CHANNEL },
    });
  }
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined;

/** Coalesces bursts of changes (several status taps, a realtime update) into one reschedule. */
export function refreshReminders(userId: string) {
  if (!supported) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    rescheduleReminders(userId).catch(() => {
      // Offline or a transient error: the next app foreground tries again.
    });
  }, 1500);
}

let registeredToken: string | null = null;

/** Saves this phone's FCM token for push. Skipped quietly when Firebase isn't configured. */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS !== "android" || !(await ensurePermission())) return;
  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== "string") return;
    await supabase.rpc("register_push_token", { p_token: data, p_platform: "android" });
    registeredToken = data;
  } catch {
    // No google-services.json in this build: local reminders still work.
  }
}

/** Before signing out: stop pushes to this phone and drop the reminders. */
export async function clearPhoneNotifications(): Promise<void> {
  if (!supported) return;
  if (registeredToken) {
    await supabase.rpc("unregister_push_token", { p_token: registeredToken });
    registeredToken = null;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
}
