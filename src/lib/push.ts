// System notifications (Web Push) in the browser: the service worker (public/sw.js) shows them even
// with Detoke closed. A browser subscribes once; signed in, it belongs to that account (new orders of
// the business, status of the orders placed), and it can also follow orders placed without an account.
import { api } from '@/api';

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

// Set when the user turns the notifications off here, so signing in again does not turn them back on.
const OFF_KEY = 'detoke.pushOff';

function setTurnedOff(off: boolean) {
  try {
    if (off) localStorage.setItem(OFF_KEY, '1');
    else localStorage.removeItem(OFF_KEY);
  } catch {
    /* storage not available */
  }
}

function turnedOff() {
  try {
    return localStorage.getItem(OFF_KEY) === '1';
  } catch {
    return false;
  }
}

export const pushSupported = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers the service worker once, at startup. */
export function registerServiceWorker() {
  if (!pushSupported()) return Promise.resolve(null);
  registration ??= navigator.serviceWorker.register('/sw.js').catch(() => null);
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

async function subscribe() {
  const reg = await registerServiceWorker();
  if (!reg) throw new Error('Este navegador no admite notificaciones');
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  const { publicKey } = await api<{ publicKey: string }>('/push/key');
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
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
  setTurnedOff(false);
  return 'on';
}

/** Turns the notifications off on this browser. `remember` keeps them off after signing in again. */
export async function disablePush({ remember = true } = {}) {
  if (remember) setTurnedOff(true);
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api('/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

/**
 * Without asking anything: where the user already allowed notifications (and did not turn them off
 * here), subscribes this browser and tells the server, so it belongs to the session's account and,
 * with `orderCode`, follows that order. Returns whether the browser is subscribed.
 */
export async function syncPush(orderCode?: string) {
  if (!pushSupported() || Notification.permission !== 'granted' || turnedOff()) return false;
  try {
    await save(await subscribe(), orderCode);
    return true;
  } catch {
    return false;
  }
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
