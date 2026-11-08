import { describe, expect, it } from 'vitest';
import { actionLabel, statusLabel } from '../shared/orders.js';

describe('status labels', () => {
  it('uses one word per status, the same for pickup and delivery', () => {
    expect(statusLabel('pending')).toBe('Recibido');
    expect(statusLabel('pending', 'business')).toBe('Nuevo');
    expect(statusLabel('completed')).toBe('Finalizado');
    expect(actionLabel('completed')).toBe('Finalizar pedido');
  });
});
