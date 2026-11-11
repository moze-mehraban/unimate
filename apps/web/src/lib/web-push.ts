// Browser side of Web Push: the service worker (public/sw.js) plus this browser's
// subscription, saved per user with register_web_push. Call only in the browser.

import { createClient } from "@/lib/supabase/client";
import { VAPID_PUBLIC_KEY } from "./web-push-key";

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

function fromB64url(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function toB64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function supported(): boolean {
  return Boolean(VAPID_PUBLIC_KEY) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhone/iPad only allow push for sites added to the home screen. */
function needsInstall(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/** Subscribed with the current key? (Stale after the VAPID keys are rotated.) */
function current(sub: PushSubscription | null | undefined): boolean {
  const key = sub?.options.applicationServerKey;
  return Boolean(key) && toB64url(key!) === VAPID_PUBLIC_KEY;
}

async function subscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

async function save(sub: PushSubscription) {
  const { keys } = sub.toJSON();
  const { error } = await createClient().rpc("register_web_push", {
    p_endpoint: sub.endpoint,
    p_p256dh: keys?.p256dh ?? "",
    p_auth: keys?.auth ?? "",
  });
  if (error) throw error;
}

export async function getPushState(): Promise<PushState> {
  if (!VAPID_PUBLIC_KEY) return "unsupported";
  if (!supported()) return needsInstall() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && current(await subscription()) ? "on" : "off";
}

/** Asks for permission, subscribes this browser and saves it for the signed-in user. */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  await navigator.serviceWorker.register("/sw.js");
  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (sub && !current(sub)) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: fromB64url(VAPID_PUBLIC_KEY),
  });
  await save(sub);
  return "on";
}

/** Stops pushes to this browser (turned off, or before signing out). */
export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const sub = await subscription();
  if (!sub) return;
  await createClient().rpc("unregister_web_push", { p_endpoint: sub.endpoint });
  await sub.unsubscribe();
}

/** On app load: keep this browser's subscription saved, and renew it if the key changed. */
export async function syncPush(): Promise<void> {
  if (!supported() || Notification.permission !== "granted") return;
  const sub = await subscription();
  if (!sub) return;
  if (current(sub)) await save(sub);
  else await enablePush();
}
