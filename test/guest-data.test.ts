import { beforeEach, describe, expect, it } from 'vitest';
import { CART_KEY, GUEST_DATA_KEY, saveGuestData, takeGuestData } from '../src/lib/guestData.js';

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  },
});

describe('guest data', () => {
  beforeEach(() => store.clear());

  it('sets the visitor data aside at sign-in and gives it back once', () => {
    store.set(CART_KEY, '[{"id":"p1","quantity":2}]');
    saveGuestData();
    store.set(CART_KEY, '[{"id":"account","quantity":1}]');
    const guest = takeGuestData();
    expect(guest?.[CART_KEY]).toBe('[{"id":"p1","quantity":2}]');
    expect(store.has(GUEST_DATA_KEY)).toBe(false);
    expect(takeGuestData()).toBeNull();
  });
});
