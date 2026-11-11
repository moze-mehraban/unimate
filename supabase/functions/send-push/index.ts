// send-push: delivers one notification to the recipient's phones (FCM HTTP v1) and
// browsers (Web Push). Events go to both. Class/deadline reminders go to browsers, and
// to each phone only when its app hasn't scheduled that reminder itself (phone_reminders),
// e.g. for an assignment added while the app was closed.
//
// Called by the queue_push() trigger (pg_net) with {"notification_id": "…"} and
// "Authorization: Bearer <PUSH_FUNCTION_KEY>". Secrets (supabase secrets set …):
//   PUSH_FUNCTION_KEY         shared secret; same value as the push_function_key Vault secret
//   FIREBASE_SERVICE_ACCOUNT  the Firebase service-account JSON (phones; optional)
//   VAPID_KEYS                {"publicKey", "privateKey" (JWK), "subject"} (browsers; optional)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
// Setup: npm run push:setup -- <firebase.json> and/or --web (see docs/PUSH_NOTIFICATIONS.md).

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWebPush, type VapidKeys } from "./webpush.ts";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
type Payload = Record<string, string | null | undefined>;

/** reminder_log / phone_reminders key of a reminder notification; null for events. */
function reminderKey(type: string, p: Payload): { kind: string; ref_id: string; occurs_at: string } | null {
  if (type === "class_starting" && p.session_id && p.starts_at) {
    return { kind: "class", ref_id: p.session_id, occurs_at: p.starts_at };
  }
  if (type === "assignment_due_soon" && p.assignment_id && p.due_at) {
    return { kind: "deadline", ref_id: p.assignment_id, occurs_at: p.due_at };
  }
  return null;
}

// --- Text. Mirrors describeNotification() in packages/shared/src/notifications.ts
// (Deno can't import the workspace package); Persian digits and Tehran time via Intl.

const toFa = (value: string) => value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const room = (r: string) => (/^\d/.test(r) ? `اتاق ${toFa(r)}` : r);

function deadline(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${day} ساعت ${toFa(time)}`;
}

function describe(type: string, classId: string | null, p: Payload): { title: string; body: string; url: string } | null {
  const course = p.course_name || "کلاس";
  const classUrl = classId ? `/classes/${classId}` : "/classes";
  const due = p.due_at ? ` · مهلت: ${deadline(p.due_at)}` : "";
  switch (type) {
    case "assignment_created":
      return {
        title: `تکلیف جدید در ${course}`,
        body: `«${p.title ?? ""}»${p.creator_name ? ` — ثبت توسط ${p.creator_name}` : ""}${due}`,
        url: classUrl,
      };
    case "join_request_received":
      return { title: `درخواست عضویت در ${course}`, body: `${p.requester_name || "یک کاربر"} می‌خواهد به کلاس بپیوندد.`, url: classUrl };
    case "join_request_approved":
      return { title: "درخواستت تأیید شد", body: `حالا عضو ${course} هستی.`, url: classUrl };
    case "join_request_rejected":
      return { title: "درخواستت رد شد", body: `درخواست عضویت در ${course} پذیرفته نشد.`, url: "/classes" };
    case "class_starting":
      return {
        title: `کلاس ${course} به‌زودی شروع می‌شود`,
        body: `ساعت ${p.start_time ? toFa(p.start_time) : ""}${p.room ? ` · ${room(p.room)}` : ""}`,
        url: classUrl,
      };
    case "assignment_due_soon":
      return { title: "مهلت تکلیف نزدیک است", body: `«${p.title ?? ""}» در ${course}${due}`, url: classUrl };
    case "assignment_reported":
      return { title: `گزارش اطلاعات نادرست در ${course}`, body: `«${p.title ?? ""}»: ${p.reason ?? ""}`, url: classUrl };
    default:
      return null;
  }
}

// --- Google OAuth for FCM: a JWT signed with the service account's key ---------------

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const encodeJson = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));

let cachedToken: { value: string; expiresAt: number } | null = null;

async function googleAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  // Keys pasted into secrets sometimes keep "\n" as two characters instead of newlines.
  const pem = sa.private_key
    .replace(/\\n/g, "\n")
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

// --- Handler ----------------------------------------------------------------------

Deno.serve(async (req) => {
  const key = Deno.env.get("PUSH_FUNCTION_KEY");
  if (!key || req.headers.get("Authorization") !== `Bearer ${key}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const { notification_id } = await req.json().catch(() => ({}));
  if (typeof notification_id !== "string") return new Response("notification_id required", { status: 400 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: n } = await supabase
    .from("notifications")
    .select("user_id, type, class_id, payload")
    .eq("id", notification_id)
    .maybeSingle();
  if (!n) return new Response("not found", { status: 404 });

  const message = describe(n.type, n.class_id, (n.payload ?? {}) as Payload);
  if (!message) return Response.json({ sent: 0, skipped: "unknown type" });

  const reminder = reminderKey(n.type, (n.payload ?? {}) as Payload);
  const [phones, browsers] = await Promise.all([
    sendToPhones(supabase, n.user_id, { ...message, tag: reminder ? phoneTag(reminder) : undefined }, reminder),
    sendToBrowsers(supabase, n.user_id, { ...message, tag: notification_id }),
  ]);
  return Response.json({ sent: phones + browsers, phones, browsers });
});

/** Same tag as the app's local reminder identifier, so Android shows one notification, not two. */
const phoneTag = (k: { kind: string; ref_id: string; occurs_at: string }) => `${k.kind}:${k.ref_id}:${Date.parse(k.occurs_at)}`;

type Client = ReturnType<typeof createClient>;
type Message = { title: string; body: string; url: string };

async function sendToPhones(
  supabase: Client,
  userId: string,
  message: Message & { tag?: string },
  reminder: ReturnType<typeof reminderKey>,
): Promise<number> {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) return 0;
  let { data: tokens } = await supabase.from("push_tokens").select("token").eq("user_id", userId);

  // For a reminder, skip each phone that already scheduled it locally (it would come twice).
  if (reminder && tokens?.length) {
    const { data: covered } = await supabase
      .from("phone_reminders")
      .select("token")
      .in("token", tokens.map((t) => t.token))
      .eq("kind", reminder.kind)
      .eq("ref_id", reminder.ref_id)
      .eq("occurs_at", reminder.occurs_at);
    const skip = new Set((covered ?? []).map((c) => c.token));
    tokens = tokens.filter((t) => !skip.has(t.token));
  }
  if (!tokens?.length) return 0;

  const sa: ServiceAccount = JSON.parse(raw);
  const accessToken = await googleAccessToken(sa);

  let sent = 0;
  for (const { token } of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          // The app opens this route when the notification is tapped.
          data: { url: message.url },
          android: { priority: "HIGH", notification: { channel_id: "default", ...(message.tag ? { tag: message.tag } : {}) } },
        },
      }),
    });
    if (res.ok) {
      sent++;
    } else {
      // The app was uninstalled or the token rotated: forget it.
      const error = await res.text();
      if (res.status === 404 || error.includes("UNREGISTERED")) {
        await supabase.from("push_tokens").delete().eq("token", token);
      } else {
        console.error(`FCM send failed (${res.status}): ${error}`);
      }
    }
  }
  return sent;
}

async function sendToBrowsers(supabase: Client, userId: string, message: Message & { tag: string }): Promise<number> {
  const raw = Deno.env.get("VAPID_KEYS");
  if (!raw) return 0;
  const { data: subs } = await supabase.from("web_push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
  if (!subs?.length) return 0;

  const vapid: VapidKeys & { subject: string } = JSON.parse(raw);
  let sent = 0;
  for (const sub of subs) {
    try {
      const res = await sendWebPush(sub, message, vapid, vapid.subject);
      if (res.ok) {
        sent++;
      } else if (res.status === 404 || res.status === 410) {
        // Unsubscribed or expired in the browser: forget it.
        await supabase.from("web_push_subscriptions").delete().eq("endpoint", sub.endpoint);
      } else {
        console.error(`Web push failed (${res.status}) for ${new URL(sub.endpoint).host}: ${await res.text()}`);
      }
    } catch (error) {
      console.error(`Web push error for ${new URL(sub.endpoint).host}: ${error}`);
    }
  }
  return sent;
}
