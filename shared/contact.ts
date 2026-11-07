// Reasons of the contact form and the status of a received message.
export const CONTACT_REASONS = ['general', 'join', 'support', 'report', 'press', 'other'] as const;
export type ContactReason = (typeof CONTACT_REASONS)[number];

export const CONTACT_REASON_LABELS: Record<ContactReason, string> = {
  general: 'Consulta general',
  join: 'Quiero sumar mi negocio',
  support: 'Soporte con mi cuenta',
  report: 'Reportar un problema',
  press: 'Prensa o alianzas',
  other: 'Otro',
};

/** Reasons that ask for the name of the business. */
export const REASONS_WITH_BUSINESS: ContactReason[] = ['join', 'support'];

export const CONTACT_STATUSES = ['new', 'read', 'archived'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface ContactInfo {
  email: string | null;
  whatsapp: string | null;
  hours: string | null;
}
