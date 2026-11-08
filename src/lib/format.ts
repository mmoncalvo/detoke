import { formatMoney } from '@shared/money';

export const formatPrice = formatMoney;

export const whatsappUrl = (phone: string, message?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
