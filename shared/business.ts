// Business rules shared by the server and the web app.

export const TIMEZONE = 'America/Montevideo';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Day = (typeof DAYS)[number];

export const DAY_LABELS: Record<Day, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export interface TimeRange {
  from: string;
  to: string;
}

export interface DayHours {
  open: boolean;
  ranges: TimeRange[];
}

export type BusinessHours = Record<Day, DayHours>;

export const PAYMENT_METHODS = ['cash', 'debit', 'credit', 'transfer', 'mercadopago'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
};

export const DELIVERY_OPTIONS = ['delivery', 'pickup'] as const;
export type DeliveryOption = (typeof DELIVERY_OPTIONS)[number];

export const DELIVERY_LABELS: Record<DeliveryOption, string> = {
  delivery: 'Delivery',
  pickup: 'Retiro en el local',
};

export const emptyHours = (): BusinessHours =>
  Object.fromEntries(DAYS.map((day) => [day, { open: false, ranges: [] }])) as unknown as BusinessHours;

/** Starting point for the hours editor: Monday to Saturday, 9 to 18. */
export const defaultHours = (): BusinessHours =>
  Object.fromEntries(
    DAYS.map((day) => [day, day === 'sunday' ? { open: false, ranges: [] } : { open: true, ranges: [{ from: '09:00', to: '18:00' }] }]),
  ) as unknown as BusinessHours;

export const hasHours = (hours?: BusinessHours | null) => !!hours && DAYS.some((day) => hours[day]?.open && hours[day].ranges.length > 0);

/** Day index (0 = monday) and HH:mm in the marketplace time zone. */
function localTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { dayIndex: DAYS.indexOf(get('weekday').toLowerCase() as Day), time: `${get('hour')}:${get('minute')}` };
}

const overnight = (range: TimeRange) => range.to <= range.from;
const dayRanges = (hours: BusinessHours, index: number) => {
  const day = hours[DAYS[(index + 7) % 7]];
  return day?.open ? day.ranges : [];
};

export interface OpenStatus {
  isOpen: boolean;
  /** Ready to show: "Abierto hasta las 20:00", "Abre mañana a las 9:00". */
  label: string;
}

export function openStatus(hours: BusinessHours | null | undefined, date = new Date()): OpenStatus {
  if (!hasHours(hours)) return { isOpen: false, label: 'Sin horarios cargados' };
  const schedule = hours as BusinessHours;
  const { dayIndex, time } = localTime(date);

  // Yesterday's overnight range may still be running.
  const carried = dayRanges(schedule, dayIndex - 1).find((r) => overnight(r) && time < r.to);
  if (carried) return { isOpen: true, label: `Abierto hasta las ${carried.to}` };

  const today = dayRanges(schedule, dayIndex);
  const current = today.find((r) => time >= r.from && (overnight(r) || time < r.to));
  if (current) return { isOpen: true, label: `Abierto hasta las ${current.to}` };

  const later = today.filter((r) => r.from > time).sort((a, b) => a.from.localeCompare(b.from))[0];
  if (later) return { isOpen: false, label: `Abre hoy a las ${later.from}` };

  for (let offset = 1; offset <= 7; offset += 1) {
    const [next] = [...dayRanges(schedule, dayIndex + offset)].sort((a, b) => a.from.localeCompare(b.from));
    if (next) {
      const when = offset === 1 ? 'mañana' : `el ${DAY_LABELS[DAYS[(dayIndex + offset) % 7]].toLowerCase()}`;
      return { isOpen: false, label: `Abre ${when} a las ${next.from}` };
    }
  }
  return { isOpen: false, label: 'Cerrado' };
}

export const todayKey = (date = new Date()): Day => DAYS[localTime(date).dayIndex];

export const formatDayHours = (day?: DayHours) =>
  day?.open && day.ranges.length > 0 ? day.ranges.map((r) => `${r.from} a ${r.to}`).join(' y ') : 'Cerrado';

export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Lowercase without accents, for searching. */
export const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Digits with country code, as wa.me expects. A bare 10-digit number is taken as Argentine. */
export function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^00/, '');
  return digits.length === 10 ? `549${digits}` : digits;
}
