/* global self, clients */
self.addEventListener("push", (event) => {
  let data = {
    title: "Anthos",
    body: "Hay cuidados pendientes para hoy",
    url: "/",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // keep defaults
  }

  const base = self.registration.scope;
  const targetUrl = data.url?.startsWith("http")
    ? data.url
    : new URL(data.url || "/", base).href;

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: new URL("icon.png", base).href,
      badge: new URL("badge.png", base).href,
      data: { url: targetUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || self.registration.scope;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
