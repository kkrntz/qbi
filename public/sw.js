// Exists so the player status page can show "You're up!" notifications on
// browsers (Android Chrome) that only allow them through a service worker.
// Tapping the notification brings the player's status page back to the front.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => c.url === url) ?? clients[0];
      return client ? client.focus() : self.clients.openWindow(url ?? "/");
    }),
  );
});
