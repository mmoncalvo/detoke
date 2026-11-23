// Detoke's service worker: shows the system notifications the server sends (Web Push), even with
// every Detoke tab closed, and opens the right page when one is clicked. It caches nothing.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const windows = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true });

// Every push is shown, always: the browser requires it, and a notification that sometimes appears and
// sometimes does not (because a Detoke tab happened to be in front) is worse than a repeated one.
self.addEventListener('push', (event) => {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    data = null;
  }
  const title = (data && data.title) || 'Detoke';
  event.waitUntil(self.registration.showNotification(title, {
    body: (data && data.body) || 'Tenés novedades en tus pedidos.',
    tag: (data && data.tag) || undefined,
    renotify: !!(data && data.tag),
    icon: '/notification-icon.png',
    badge: '/notification-badge.png',
    data: { url: (data && data.url) || '/' },
  }));
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

// The browser can replace a subscription on its own (it expired, or the push service rotated it).
// Subscribe again and tell the server, which moves the account and followed orders to the new one.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const previous = event.oldSubscription;
    const fresh = event.newSubscription || await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: previous && previous.options.applicationServerKey,
    });
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: fresh.toJSON(), previousEndpoint: previous ? previous.endpoint : undefined }),
    });
  })().catch(() => undefined));
});
