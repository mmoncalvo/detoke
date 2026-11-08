// Validation shared by the API and the forms. Messages are shown to users.
import { z } from 'zod';
import { CONTACT_REASONS, CONTACT_STATUSES } from './contact.js';
import { ORDER_STATUSES } from './orders.js';
import { DAYS, DELIVERY_OPTIONS, normalizeWhatsapp, PAYMENT_METHODS, type BusinessHours } from './business.js';

const required = (label: string, max = 120) => z.string({ required_error: `Completá ${label}` }).trim().min(1, `Completá ${label}`).max(max, `Máximo ${max} caracteres`);

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).nullish().transform((v) => v || null);

const optionalUrl = z
  .string()
  .trim()
  .max(255)
  .nullish()
  .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null))
  .refine((v) => v === null || z.string().url().safeParse(v).success, 'Ingresá una dirección web válida');

const whatsapp = z
  .string({ required_error: 'Completá el WhatsApp' })
  .transform(normalizeWhatsapp)
  .refine((v) => /^[1-9]\d{9,14}$/.test(v), 'Ingresá el número con código de área, por ejemplo 11 2345 6789');

const optionalPhone = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || /^[+\d][\d\s()-]{6,20}$/.test(v), 'Ingresá un teléfono válido');

const money = (label: string) =>
  z.coerce.number({ invalid_type_error: `Ingresá ${label}` }).min(0, 'No puede ser negativo').max(99_999_999, 'El valor es demasiado alto');

const optionalMoney = z.preprocess((v) => (v === '' || v === undefined ? null : v), money('un número').nullable());

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horario inválido');

const dayHours = z
  .object({ open: z.boolean(), ranges: z.array(z.object({ from: time, to: time })).max(3, 'Hasta tres franjas por día') })
  .refine((day) => !day.open || day.ranges.length > 0, 'Agregá al menos una franja horaria')
  .refine((day) => day.ranges.every((r) => r.from !== r.to), 'La franja debe tener un inicio y un fin distintos');

export const hoursSchema = z.object(Object.fromEntries(DAYS.map((day) => [day, dayHours]))) as unknown as z.ZodType<BusinessHours>;

export const accountSchema = z.object({
  name: required('tu nombre'),
  email: z.string({ required_error: 'Completá el email' }).trim().toLowerCase().email('Ingresá un email válido'),
  password: z.string({ required_error: 'Elegí una contraseña' }).min(8, 'Usá al menos 8 caracteres').max(72, 'Máximo 72 caracteres'),
});

export const newBusinessSchema = z.object({
  name: required('el nombre del negocio', 80),
  businessCategoryId: required('el rubro'),
  whatsapp,
});

export const registerSchema = accountSchema.extend({ business: newBusinessSchema });

/** What a user edits in Mi cuenta. */
export const profileSchema = z.object({
  name: required('tu nombre'),
  email: accountSchema.shape.email,
  phone: optionalPhone,
});

export const passwordChangeSchema = z
  .object({
    /** Not needed by accounts that only sign in with Google and have no password yet. */
    currentPassword: z.string().optional(),
    newPassword: accountSchema.shape.password,
    confirmPassword: z.string({ required_error: 'Repetí la contraseña nueva' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden' });

export const loginSchema = z.object({
  email: z.string({ required_error: 'Completá el email' }).trim().toLowerCase().email('Ingresá un email válido'),
  password: z.string({ required_error: 'Completá la contraseña' }).min(1, 'Completá la contraseña'),
});

export const businessUpdateSchema = z
  .object({
    name: required('el nombre del negocio', 80),
    businessCategoryId: required('el rubro'),
    tagline: optionalText(90),
    description: optionalText(600),
    whatsapp,
    phone: optionalPhone,
    email: z.string().trim().nullish().transform((v) => v || null).refine((v) => v === null || z.string().email().safeParse(v).success, 'Ingresá un email válido'),
    website: optionalUrl,
    instagram: optionalText(60).transform((v) => v?.replace(/^@/, '') ?? null),
    facebook: optionalUrl,
    address: optionalText(160),
    neighborhood: optionalText(80),
    city: optionalText(80),
    province: optionalText(80),
    postalCode: optionalText(12),
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    hours: hoursSchema,
    deliveryOptions: z.array(z.enum(DELIVERY_OPTIONS)).min(1, 'Elegí al menos una forma de entrega'),
    deliveryFee: optionalMoney,
    minimumOrder: optionalMoney,
    deliveryRadiusKm: z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().min(0).max(100, 'Máximo 100 km').nullable()),
    paymentMethods: z.array(z.enum(PAYMENT_METHODS)).min(1, 'Elegí al menos un medio de pago'),
  })
  .partial();

export const productSchema = z.object({
  name: required('el nombre del producto', 100),
  description: optionalText(500),
  price: z.coerce.number({ invalid_type_error: 'Ingresá el precio' }).positive('El precio debe ser mayor a cero').max(99_999_999, 'El valor es demasiado alto'),
  compareAtPrice: optionalMoney,
  images: z.array(z.string().max(255)).max(6, 'Hasta seis imágenes').default([]),
  stock: z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().int('Usá un número entero').min(0, 'No puede ser negativo').nullable()),
  isAvailable: z.boolean().default(true),
  featured: z.boolean().default(false),
  productCategoryId: z.string().trim().nullish().transform((v) => v || null),
});

export const productUpdateSchema = z.object({
  name: productSchema.shape.name,
  description: productSchema.shape.description,
  price: productSchema.shape.price,
  compareAtPrice: productSchema.shape.compareAtPrice,
  images: z.array(z.string().max(255)).max(6, 'Hasta seis imágenes'),
  stock: productSchema.shape.stock,
  isAvailable: z.boolean(),
  featured: z.boolean(),
  productCategoryId: productSchema.shape.productCategoryId,
}).partial();

export const contactSchema = z.object({
  name: required('tu nombre', 80),
  email: z.string({ required_error: 'Completá el email' }).trim().toLowerCase().email('Ingresá un email válido'),
  phone: optionalPhone,
  reason: z.enum(CONTACT_REASONS, { errorMap: () => ({ message: 'Elegí un motivo' }) }),
  businessName: optionalText(80),
  message: z.string({ required_error: 'Escribí tu mensaje' }).trim().min(10, 'Contanos un poco más, al menos 10 caracteres').max(2000, 'Máximo 2000 caracteres'),
  consent: z.boolean({ required_error: 'Necesitamos tu aceptación para responderte' }).refine((v) => v, 'Necesitamos tu aceptación para responderte'),
  /** Honeypot: hidden from people, bots fill it in. */
  company: z.string().max(200).optional(),
});

export const contactStatusSchema = z.object({ status: z.enum(CONTACT_STATUSES, { errorMap: () => ({ message: 'Estado inválido' }) }) });

export const orderCreateSchema = z.object({
  clientRequestId: z.string().uuid().nullish(),
  businessId: required('el negocio'),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1, 'Cantidad inválida').max(99, 'Máximo 99 por producto') }))
    .min(1, 'El pedido está vacío').max(60, 'Demasiados productos en un pedido'),
  fulfillment: z.enum(DELIVERY_OPTIONS, { errorMap: () => ({ message: 'Elegí cómo lo recibís' }) }),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Elegí cómo pagás' }) }),
  customerName: required('tu nombre', 80),
  customerPhone: optionalPhone,
  deliveryAddress: optionalText(200),
  notes: optionalText(500),
}).refine((o) => o.fulfillment !== 'delivery' || !!o.deliveryAddress, { message: 'Completá la dirección de entrega', path: ['deliveryAddress'] });

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { errorMap: () => ({ message: 'Estado inválido' }) }),
  reason: optionalText(200),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type PasswordChangeInput = z.input<typeof passwordChangeSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type BusinessUpdate = z.output<typeof businessUpdateSchema>;
export type ProductInput = z.input<typeof productSchema>;
