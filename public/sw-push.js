// Push notification handlers — imported by VitePWA's workbox SW via importScripts
// Do NOT register this file directly; it is loaded by the generated service worker.

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};
      let title = "Porra Mundial 2026";
      let body = "Tienes una nueva notificación";
      let url = "/dashboard";
      let ackUrl = null;

      try {
        if (event.data) {
          try {
            payload = event.data.json();
          } catch (_e) {
            try {
              const txt = event.data.text();
              payload = { message: txt };
            } catch (_e2) {
              console.warn("SW: could not read push data at all");
            }
          }
        }

        title = payload.title || payload?.notification?.title || title;
        body = payload.body || payload?.notification?.body || payload.message || body;
        url = payload?.data?.url || payload?.notification?.data?.url || payload.url || url;
        ackUrl = payload.ack_url || null;

        if (typeof title !== "string" || !title.trim()) title = "Porra Mundial 2026";
        if (typeof body !== "string" || !body.trim()) body = "Tienes una nueva notificación";
      } catch (err) {
        console.error("SW push parse failed:", err);
      }

      console.log("[sw-push] push received, title:", title, "ackUrl:", ackUrl ? "yes" : "no");

      const tag = "porra-push-" + Date.now();
      const options = {
        body,
        icon: "/mundial-icon-512.png",
        badge: "/mundial-icon-512.png",
        vibrate: [100, 50, 100],
        data: { url },
        tag,
        renotify: true,
      };

      try {
        await self.registration.showNotification(title, options);
        console.log("[sw-push] notification shown successfully");
      } catch (showErr) {
        console.error("SW showNotification failed:", showErr);
        await self.registration.showNotification("Porra Mundial 2026", {
          body: body || "Tienes una nueva notificación",
        });
      }

      // ACK delivery back to server
      if (ackUrl) {
        try {
          const resp = await fetch(ackUrl, { method: "POST" });
          console.log("[sw-push] delivery ACK sent, status:", resp.status);
        } catch (ackErr) {
          console.error("[sw-push] delivery ACK failed:", ackErr);
        }
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        } catch (_e) {
          // ignore
        }
      }
      return clients.openWindow(url);
    })
  );
});
