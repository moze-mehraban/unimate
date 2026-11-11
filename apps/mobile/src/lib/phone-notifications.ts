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
  // key = "<kind>:<ref id>:<start or deadline ms>": the notification identifier, and the
  // tag send-push uses, so a reminder that also comes through FCM replaces this one.
  type Reminder = { key: string; kind: "class" | "deadline"; ref: string; occurs: number; title: string; body: string; url: string };
  const reminders: (Reminder & { at: number })[] = [];
  // Reminder time already passed but the class/deadline is still ahead (e.g. an
  // assignment added with a deadline closer than the reminder setting).
  const late: Reminder[] = [];

  if (classMinutes !== null) {
    for (let d = 0; d <= HORIZON_DAYS; d++) {
      const day = addDays(todayKey(now), d);
      for (const s of sessionsOnDay(sessions, day)) {
        const startsAt = fromTehranLocal(`${day}T${s.start_time.slice(0, 5)}`);
        if (!startsAt) continue;
        const start = new Date(startsAt).getTime();
        const at = start - classMinutes * 60_000;
        if (start <= now || at > until) continue;
        const text = describeNotification(
          "class_starting",
          s.class_id,
          { course_name: s.courseName, start_time: s.start_time.slice(0, 5), room: s.room },
          formatDeadlineFa,
        );
        const r: Reminder = { key: `class:${s.id}:${start}`, kind: "class", ref: s.id, occurs: start, ...text, url: text.href };
        if (at <= now) late.push(r);
        else reminders.push({ ...r, at });
      }
    }
  }

  if (deadlineHours !== null) {
    for (const item of work) {
      if (item.kind !== "assignment" || item.status === "done" || !item.dueAt) continue;
      const due = new Date(item.dueAt).getTime();
      const at = due - deadlineHours * 3_600_000;
      if (due <= now || at > until) continue;
      const text = describeNotification(
        "assignment_due_soon",
        item.classId,
        { assignment_id: item.id, title: item.title, due_at: item.dueAt, course_name: item.courseName },
        formatDeadlineFa,
      );
      const r: Reminder = { key: `deadline:${item.id}:${due}`, kind: "deadline", ref: item.id, occurs: due, ...text, url: text.href };
      if (at <= now) late.push(r);
      else reminders.push({ ...r, at });
    }
  }

  // With FCM working, the server already sends late reminders (it pushes every reminder
  // this phone hasn't scheduled). Without it, show them here, once.
  if (!(await pushAvailable())) {
    const shown = readShownLate();
    for (const r of late) {
      if (shown.has(r.key)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: r.key,
        content: { title: r.title, body: r.body, data: { url: r.url } },
        trigger: { channelId: CHANNEL },
      });
    }
    // Remember only what's still relevant, so the list stays small.
    writeShownLate(late.map((r) => r.key));
  }

  // Only our reminders are ever scheduled, so start from a clean slate.
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.key,
      content: { title: r.title, body: r.body, data: { url: r.url } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: CHANNEL },
    });
  }

  // Tell the server what this phone will show by itself; it pushes everything else
  // (e.g. a deadline added while the app was closed) to this phone through FCM.
  // Per phone: another phone on the same account may know different things.
  if (registeredToken) {
    await supabase.rpc("sync_phone_reminders", {
      p_token: registeredToken,
      p_items: reminders.map((r) => ({ kind: r.kind, ref_id: r.ref, occurs_at: new Date(r.occurs).toISOString() })),
    });
  }
}

// Keys of late reminders already shown (localStorage is persisted by expo-sqlite, see supabase.ts).
const SHOWN_LATE_KEY = "unimate.shownLateReminders";

function readShownLate(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SHOWN_LATE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeShownLate(keys: string[]) {
  try {
    localStorage.setItem(SHOWN_LATE_KEY, JSON.stringify(keys));
  } catch {
    // Not persisted: worst case a late reminder shows again next time.
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
let registration: Promise<boolean> | null = null;

/**
 * Saves this phone's FCM token for push, once per sign-in. Resolves to whether push
 * works; false (quietly) when Firebase isn't configured or there's no permission.
 */
export function registerPushToken(): Promise<boolean> {
  registration ??= (async () => {
    if (Platform.OS !== "android" || !(await ensurePermission())) return false;
    try {
      const { data } = await Notifications.getDevicePushTokenAsync();
      if (typeof data !== "string") return false;
      const { error } = await supabase.rpc("register_push_token", { p_token: data, p_platform: "android" });
      if (error) throw error;
      registeredToken = data;
      return true;
    } catch {
      // No google-services.json in this build, or offline: local reminders still work.
      registration = null; // try again next time
      return false;
    }
  })();
  return registration;
}

const pushAvailable = () => registerPushToken();

/** Before signing out: stop pushes to this phone and drop the reminders. */
export async function clearPhoneNotifications(): Promise<void> {
  if (!supported) return;
  if (registeredToken) {
    // Also drops this phone's reminder list on the server.
    await supabase.rpc("unregister_push_token", { p_token: registeredToken });
    registeredToken = null;
  }
  registration = null;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
