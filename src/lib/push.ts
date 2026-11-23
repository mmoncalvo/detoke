// System notifications (Web Push) in the browser: the service worker (public/sw.js) shows them even
// with Detoke closed. A browser subscribes once; signed in, it belongs to that account (new orders of
// the business, status of the orders placed), and it can also follow orders placed without an account.
import { api } from '@/api';

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

// Guests keep whether they want notifications in the browser; accounts keep it in the database (users.notifications).
const PREFERENCE_KEY = 'detoke.notifications';

export function readLocalPreference(): boolean | null {
  try {
    const value = localStorage.getItem(PREFERENCE_KEY);
    return value === 'on' ? true : value === 'off' ? false : null;
  } catch {
    return null;
  }
}

export function writeLocalPreference(on: boolean) {
  try {
    localStorage.setItem(PREFERENCE_KEY, on ? 'on' : 'off');
  } catch {
    /* storage not available */
  }
}

export const pushSupported = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers the service worker once, at startup. */
export function registerServiceWorker() {
  if (!pushSupported()) return Promise.resolve(null);
  // Wait until the worker is active: subscribing before that fails on a first visit.
  registration ??= navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then(() => navigator.serviceWorker.ready)
    .catch(() => {
      registration = null;
      return null;
    });
  return registration;
}

async function currentSubscription() {
  const reg = await registerServiceWorker();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  return (await currentSubscription()) ? 'on' : 'off';
}

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a || a.byteLength !== b.byteLength) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((value, i) => value === b[i]);
};

let subscribing: Promise<PushSubscription> | null = null;

/**
 * This browser's subscription, made with the server's current key. A subscription made with an older
 * key (the database was reset, or the keys changed) can no longer receive anything: it is replaced.
 * Several callers at once share one attempt.
 */
function subscribe() {
  subscribing ??= (async () => {
    const reg = await registerServiceWorker();
    if (!reg) throw new Error('Este navegador no admite notificaciones');
    const key = keyBytes((await api<{ publicKey: string }>('/push/key')).publicKey);
    const existing = await reg.pushManager.getSubscription();
    if (existing && sameKey(existing.options.applicationServerKey, key)) return existing;
    if (existing) await existing.unsubscribe().catch(() => undefined);
    return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  })().finally(() => {
    subscribing = null;
  });
  return subscribing;
}

const save = (subscription: PushSubscription, orderCode?: string) =>
  api('/push/subscribe', { method: 'POST', body: { subscription: subscription.toJSON(), orderCode } });

/**
 * Asks for permission (it must run in a click) and subscribes this browser. With `orderCode` it also
 * follows that order. Returns the resulting state.
 */
export async function enablePush(orderCode?: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  await save(await subscribe(), orderCode);
  return 'on';
}

/** Stops the notifications on this browser. */
export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api('/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

/**
 * Without asking anything: where the browser already allowed notifications, subscribes this browser and tells the server, so it belongs to the session's account and,
 * with `orderCode`, follows that order. Returns whether the browser is subscribed.
 */
export async function syncPush(orderCode?: string) {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    await save(await subscribe(), orderCode);
    return true;
  } catch {
    return false;
  }
}

/** Sends a test notification to this browser, to check that they arrive. */
export async function testPush() {
  const subscription = await subscribe();
  await save(subscription);
  await api('/push/test', { method: 'POST', body: { endpoint: subscription.endpoint } });
}

/** Clicking a notification with Detoke open moves that window to the page (see public/sw.js). */
export function onPushNavigate(handler: (path: string) => void) {
  if (!pushSupported()) return () => undefined;
  const listener = (event: MessageEvent) => {
    if (event.data?.type !== 'detoke:navigate') return;
    const url = new URL(event.data.url, window.location.origin);
    if (url.origin === window.location.origin) handler(url.pathname + url.search + url.hash);
  };
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}
