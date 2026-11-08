// Prices are Uruguayan pesos: "$ 450", and two decimals only when there are cents ("$ 99,50").
export const CURRENCY = 'UYU';
export const LOCALE = 'es-UY';

const whole = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatMoney = (value: number) => (Number.isInteger(value) ? whole : cents).format(value);
