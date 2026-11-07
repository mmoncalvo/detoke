const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const formatPrice = (value: number) => currency.format(value);

export const whatsappUrl = (phone: string, message?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
