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

export const PAYMENT_METHODS = ['cash', 'pos', 'transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  pos: 'POS',
  transfer: 'Transferencia',
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

/** Offset of the marketplace time zone from UTC at that instant, in ms (Montevideo: -3 h). */
function zoneOffset(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The instant of a wall-clock time (HH:mm) on a local calendar day given as a UTC midnight. */
function zonedInstant(dayUtc: number, time: string) {
  const [h, m] = time.split(':').map(Number);
  const guess = dayUtc + (h * 60 + m) * 60_000;
  return guess - zoneOffset(new Date(guess));
}

/**
 * The moment the business has been open for `hoursCount` hours since `from`, counting only the
 * time inside its schedule. Without a schedule the hours run straight through.
 */
export function afterOpenHours(hours: BusinessHours | null | undefined, from: Date, hoursCount: number): Date {
  let remaining = hoursCount * 3_600_000;
  if (!hasHours(hours)) return new Date(from.getTime() + remaining);
  const schedule = hours as BusinessHours;
  const start = from.getTime();
  // Local calendar day of `from`, as UTC midnight; start one day earlier for overnight ranges.
  const local = new Date(start + zoneOffset(from));
  const firstDay = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 86_400_000;

  // Overlapping ranges count once: nothing before the cursor is counted again.
  let cursor = start;
  // A schedule open at least once a week gives 24 h within a few months; the cap only guards odd data.
  for (let week = 0; week < 60; week += 1) {
    const intervals: [number, number][] = [];
    for (let i = 0; i < 7; i += 1) {
      const day = firstDay + (week * 7 + i) * 86_400_000;
      const dayIndex = (new Date(day).getUTCDay() + 6) % 7;
      for (const range of dayRanges(schedule, dayIndex)) {
        const open = zonedInstant(day, range.from);
        const close = zonedInstant(overnight(range) ? day + 86_400_000 : day, range.to);
        if (close > open) intervals.push([open, close]);
      }
    }
    intervals.sort((a, b) => a[0] - b[0]);
    for (const [open, close] of intervals) {
      const begin = Math.max(open, cursor);
      if (close <= begin) continue;
      if (close - begin >= remaining) return new Date(begin + remaining);
      remaining -= close - begin;
      cursor = Math.max(cursor, close);
    }
  }
  return new Date(start + hoursCount * 3_600_000);
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

/**
 * Digits with country code, as wa.me expects. Uruguayan local numbers get 598: a mobile with its
 * leading 0 (099 123 456) or any 8-digit number (99 123 456, 4534 1234). A bare 10-digit number is
 * still taken as Argentine.
 */
export function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^00/, '');
  if (digits.length === 9 && digits.startsWith('09')) return `598${digits.slice(1)}`;
  if (digits.length === 8) return `598${digits}`;
  return digits.length === 10 ? `549${digits}` : digits;
}
