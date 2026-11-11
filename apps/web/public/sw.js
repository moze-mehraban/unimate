// UniMate service worker: shows Web Push notifications sent by the send-push Edge
// Function ({title, body, url, tag}) and opens the right page when one is clicked.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "یونی‌میت", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/notification-badge.png",
      dir: "rtl",
      lang: "fa",
      tag: data.tag,
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        try {
          await open.navigate(target);
          return;
        } catch {
          // Not controlled by this worker yet: open a new tab instead.
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
