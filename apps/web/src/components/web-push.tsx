"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { buttonStyles } from "@/components/ui";
import { disablePush, enablePush, getPushState, syncPush, type PushState } from "@/lib/web-push";

const MESSAGES: Partial<Record<PushState, string>> = {
  unsupported: "این مرورگر از اعلان پشتیبانی نمی‌کند.",
  "needs-install":
    "در آیفون و آیپد: سایت را با دکمهٔ Share ← «Add to Home Screen» به صفحهٔ اصلی اضافه کن و از همان‌جا باز کن، بعد اعلان را روشن کن.",
  denied: "اعلان برای این سایت در مرورگر مسدود شده است. از آیکون قفل کنار نوار آدرس، اجازهٔ اعلان (Notifications) را بده و صفحه را دوباره باز کن.",
  on: "اعلان‌ها روی این مرورگر روشن است.",
};

/** Profile card body: turn browser notifications on/off for this browser. */
export function WebPushToggle() {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPushState().then(setState, () => setState("unsupported"));
  }, []);

  async function run(task: () => Promise<PushState>) {
    setBusy(true);
    setError("");
    try {
      setState(await task());
    } catch {
      setError("انجام نشد. اتصال اینترنت را بررسی کن و دوباره امتحان کن.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <div className="h-10 w-40 animate-pulse rounded-lg bg-background" />;

  return (
    <div className="flex flex-col items-start gap-3 text-sm">
      {MESSAGES[state] ? <p className={state === "on" ? "text-success" : "text-muted"}>{MESSAGES[state]}</p> : null}
      {error ? <p className="text-danger">{error}</p> : null}
      {state === "off" ? (
        <button type="button" className={buttonStyles.primary} disabled={busy} onClick={() => run(enablePush)}>
          {busy ? "لطفاً صبر کنید…" : "روشن کردن اعلان‌ها"}
        </button>
      ) : null}
      {state === "on" ? (
        <button
          type="button"
          className={buttonStyles.secondary}
          disabled={busy}
          onClick={() => run(async () => (await disablePush(), "off"))}
        >
          {busy ? "لطفاً صبر کنید…" : "خاموش کردن"}
        </button>
      ) : null}
    </div>
  );
}

/** Mounted in the app layout: keeps this browser's subscription tied to the signed-in user. */
export function WebPushSync() {
  useEffect(() => {
    syncPush().catch(() => {
      // Offline or blocked: the next page load tries again.
    });
  }, []);
  return null;
}

/** Sign-out that first stops pushes to this browser, so the next person here doesn't get them. */
export function SignOutButton() {
  return (
    <form
      action={async () => {
        await disablePush().catch(() => {});
        await signOut();
      }}
    >
      <button type="submit" className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-danger">
        خروج
      </button>
    </form>
  );
}
