import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Order } from '@shared/orders';
import { api } from '@/api';
import { useRoom, useSocketEvent } from '@/hooks/useRealtime';

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

/** Two short tones, made in the browser (no audio file). Browsers allow it after the first interaction. */
function chime() {
  try {
    const context = new AudioContext();
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
    setTimeout(() => void context.close(), 800);
  } catch {
    /* no audio */
  }
}

/**
 * Seller-wide: joins the business room, counts pending orders, and on a new order shows a
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
    toast.success(`Nuevo pedido #${order.number}`, {
      description: `${order.customerName} · ${order.items.length} ${order.items.length === 1 ? 'producto' : 'productos'}`,
      action: { label: 'Ver', onClick: onOpen },
      duration: 8000,
    });
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
