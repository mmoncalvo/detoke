import { describe, expect, it } from 'vitest';
import { actionLabel, statusLabel } from '../shared/orders.js';

describe('status labels', () => {
  it('reads the last step as sent for delivery and ready for pickup', () => {
    expect(statusLabel('sent', 'customer', 'delivery')).toBe('Enviado');
    expect(statusLabel('sent', 'customer', 'pickup')).toBe('Retirar');
    expect(statusLabel('sent')).toBe('Enviado');
    expect(actionLabel('sent', 'pickup')).toBe('Marcar para retirar');
    expect(statusLabel('pending', 'business', 'pickup')).toBe('Nuevo');
  });
});
