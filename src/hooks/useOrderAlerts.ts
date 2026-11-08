import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Order } from '@shared/orders';
import { api } from '@/api';
import { useRoom, useSocketEvent } from '@/hooks/useRealtime';
import { formatPrice } from '@/lib/format';

const SOUND_KEY = 'detoke.orderSound';

export function readSoundPreference() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundPreference(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* storage not available */
  }
}

// One audio context for the whole app. Browsers only let it play after the user interacts with the
// page, so the first click or key press unlocks it; a new order later can then be heard anywhere.
let audio: AudioContext | null = null;

function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    /* no audio */
  }
}

if (typeof window !== 'undefined') {
  for (const event of ['pointerdown', 'keydown'] as const) window.addEventListener(event, unlockAudio, { passive: true });
}

/** Two short tones, made in the browser (no audio file). */
function chime() {
  try {
    unlockAudio();
    const context = audio!;
    [880, 1320].forEach((frequency, i) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + i * 0.18 + 0.16);
      osc.connect(gain).connect(context.destination);
      osc.start(context.currentTime + i * 0.18);
      osc.stop(context.currentTime + i * 0.18 + 0.17);
    });
  } catch {
    /* no audio */
  }
}

/** Browser notifications, only when the user turned them on (from Mi cuenta) and the tab is in the background. */
export const canNotify = () => typeof Notification !== 'undefined';

function notify(title: string, body: string, onClick: () => void) {
  if (!canNotify() || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    const notification = new Notification(title, { body, icon: '/favicon.svg', tag: title });
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  } catch {
    /* not supported here */
  }
}

/**
 * Seller-wide, mounted once for the whole app (OrderAlertsProvider): joins the business room, counts pending orders, and on a new order shows a
 * toast, plays a sound (if enabled) and keeps the count in the tab title.
 */
export function useOrderAlerts(businessId: string | null | undefined, onOpen: () => void) {
  const [pending, setPending] = useState(0);

  const refresh = useCallback(() => {
    if (!businessId) return;
    api<Order[]>('/orders/mine?status=pending').then((orders) => setPending(orders.length)).catch(() => undefined);
  }, [businessId]);

  useEffect(refresh, [refresh]);
  useRoom('business', businessId, refresh);

  useSocketEvent('order:created', (order) => {
    if (order.businessId !== businessId) return;
    setPending((n) => n + 1);
    if (readSoundPreference()) chime();
    const title = `Nuevo pedido #${order.number} · ${formatPrice(order.total)}`;
    const count = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const description = `${order.customerName} · ${count} ${count === 1 ? 'producto' : 'productos'}`;
    toast.success(title, { description, action: { label: 'Ver pedido', onClick: onOpen }, duration: 12000 });
    notify(title, description, onOpen);
  });
  useSocketEvent('order:updated', (order) => {
    if (order.businessId === businessId) refresh();
  });

  // "(2) Pedidos · Detoke": pages set their own title, this only adds the count.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = pending > 0 ? `(${pending}) ${base}` : base;
  });

  return pending;
}
