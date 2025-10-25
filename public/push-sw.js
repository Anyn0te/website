self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (error) {
    payload = { title: "Anyn0te", body: event.data.text() };
  }

  const title = payload.title || "Anyn0te";
  const options = {
    body: payload.body || "Open Anyn0te to view your updates.",
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || payload.icon || "/favicon.ico",
    data: {
      url: payload.url || "/dashboard",
    },
  };

  const notifyClients = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: "anynote:notification-update" });
      });
    })
    .catch(() => undefined);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      notifyClients,
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
