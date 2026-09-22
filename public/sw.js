// Smart Click BD Service Worker - v2.5.1
// Handles Web Push notifications, fast activation, and instant cache invalidation.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up all old CacheStorage caches to prevent stale bundles
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch {}
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// -------------------- PUSH --------------------
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = { title: "Smart Click BD", body: event.data ? event.data.text() : "" };
    } catch {
      payload = {};
    }
  }

  const title = payload.title || "Smart Click BD";
  const body = payload.body || "";
  const url = payload.url || "/dashboard";
  const tag = payload.tag || "si-notice";
  const priority = payload.priority || "info";
  const icon = payload.icon || "/app-icon-192.png";
  const badge = payload.badge || "/app-icon-192.png";

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: priority === "critical",
    vibrate: priority === "critical" ? [200, 100, 200, 100, 200] : [120, 60, 120],
    data: { url, priority, ts: Date.now() },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// -------------------- CLICK --------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            await client.focus();
            if ("navigate" in client) {
              try { await client.navigate(targetUrl); } catch {}
            }
            return;
          }
        } catch {}
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })(),
  );
});

// -------------------- SUBSCRIPTION CHANGE --------------------
// Fires when the browser rotates the push subscription. We can't re-auth here,
// so we just drop the notification; the client will re-subscribe on next login.
self.addEventListener("pushsubscriptionchange", (event) => {
  // No-op: handled by client-side re-subscription flow.
});
