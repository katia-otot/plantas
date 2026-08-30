/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js",
);

// Keep in sync with firebase-config.js (SW cannot use ES modules from that file easily).
const firebaseConfig = {
  apiKey: "AIzaSyDqz5BdXkUNfWoCTCUm2RnsWAmg-HfL44I",
  authDomain: "plantas-patio.firebaseapp.com",
  projectId: "plantas-patio",
  storageBucket: "plantas-patio.firebasestorage.app",
  messagingSenderId: "532848276167",
  appId: "1:532848276167:web:eff8aa880c6354e84c44e2",
};

const PLANTAS_URL = "http://149.50.156.136/plantas";
const ICON_URL = "https://plantas-patio.web.app/icon.png";
const BADGE_URL = "https://plantas-patio.web.app/badge.png";

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "Hoy en el patio";
  const body =
    payload.notification?.body ||
    payload.data?.body ||
    "Hay cuidados pendientes";
  const url = payload.data?.url || PLANTAS_URL;

  self.registration.showNotification(title, {
    body,
    icon: ICON_URL,
    badge: BADGE_URL,
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || PLANTAS_URL;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate?.(targetUrl);
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
