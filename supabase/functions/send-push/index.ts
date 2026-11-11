// send-push: delivers one event notification to the recipient's phones via FCM HTTP v1.
//
// Called by the queue_push() trigger (pg_net) with {"notification_id": "…"} and
// "Authorization: Bearer <PUSH_FUNCTION_KEY>". Secrets (supabase secrets set …):
//   PUSH_FUNCTION_KEY         shared secret; same value as the push_function_key Vault secret
//   FIREBASE_SERVICE_ACCOUNT  the Firebase service-account JSON (Project settings → Service accounts)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
type Payload = Record<string, string | null | undefined>;

// Push text for event notifications. Mirrors describeNotification() in
// packages/shared/src/notifications.ts (Deno can't import the workspace package);
// reminders aren't pushed — the app schedules them locally.
function describe(type: string, classId: string | null, p: Payload): { title: string; body: string; url: string } | null {
  const course = p.course_name || "کلاس";
  const classUrl = classId ? `/classes/${classId}` : "/classes";
  switch (type) {
    case "assignment_created":
      return {
        title: `تکلیف جدید در ${course}`,
        body: `«${p.title ?? ""}»${p.creator_name ? ` — ثبت توسط ${p.creator_name}` : ""}`,
        url: classUrl,
      };
    case "join_request_received":
      return { title: `درخواست عضویت در ${course}`, body: `${p.requester_name || "یک کاربر"} می‌خواهد به کلاس بپیوندد.`, url: classUrl };
    case "join_request_approved":
      return { title: "درخواستت تأیید شد", body: `حالا عضو ${course} هستی.`, url: classUrl };
    case "join_request_rejected":
      return { title: "درخواستت رد شد", body: `درخواست عضویت در ${course} پذیرفته نشد.`, url: "/classes" };
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
  if (!message) return Response.json({ sent: 0, skipped: "not an event notification" });

  const { data: tokens } = await supabase.from("push_tokens").select("token").eq("user_id", n.user_id);
  if (!tokens?.length) return Response.json({ sent: 0 });

  const sa: ServiceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "{}");
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
          android: { priority: "HIGH", notification: { channel_id: "default" } },
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
  return Response.json({ sent });
});
