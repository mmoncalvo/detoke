// Detoke's service worker: shows the system notifications the server sends (Web Push), even with
// every Detoke tab closed, and opens the right page when one is clicked. It caches nothing.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const windows = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true });

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    data = null;
  }
  if (!data || !data.title) return;
  event.waitUntil((async () => {
    // A Detoke window in the foreground already shows it (toast, sound, live status).
    const open = await windows();
    const quiet = open.some((client) => client.focused && client.visibilityState === 'visible' && new URL(client.url).pathname.startsWith(data.quietOn || '/'));
    if (quiet) return;
    await self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      renotify: true,
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      data: { url: data.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const open = await windows();
    const client = open.find((c) => new URL(c.url).origin === self.location.origin);
    if (client) {
      // The app moves to the page without reloading (see src/lib/push.ts).
      client.postMessage({ type: 'detoke:navigate', url });
      return client.focus();
    }
    return self.clients.openWindow(url);
  })());
});
