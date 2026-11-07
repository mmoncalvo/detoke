// Contact form emails. Without SMTP settings nothing is sent.
import nodemailer from 'nodemailer';
import { CONTACT_REASON_LABELS } from '../../shared/contact.js';
import { config } from '../config.js';
import type { ContactMessage } from '../models/index.js';

const { host, port, user, pass, from } = config.smtp;
const transport = host ? nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass: pass ?? '' } : undefined }) : null;

/** Notifies the team and acknowledges the sender. A mail failure never fails the request. */
export async function sendContactEmails(message: ContactMessage) {
  if (!transport || !config.contact.email) {
    if (!config.isTest) console.log(`[contact] Message ${message.id} stored; SMTP is not configured`);
    return;
  }

  const reason = CONTACT_REASON_LABELS[message.reason];
  const details = [
    `Nombre: ${message.name}`,
    `Email: ${message.email}`,
    message.phone && `Teléfono: ${message.phone}`,
    message.businessName && `Negocio: ${message.businessName}`,
    `Motivo: ${reason}`,
    '',
    message.message,
  ].filter((line) => line !== null).join('\n');

  try {
    await Promise.all([
      transport.sendMail({ from, to: config.contact.email, replyTo: message.email, subject: `Contacto: ${reason}`, text: details }),
      transport.sendMail({
        from,
        to: message.email,
        subject: 'Recibimos tu mensaje',
        text: `Hola, ${message.name}.\n\nRecibimos tu mensaje y te vamos a responder a este email.\n\nGracias por escribirnos,\nDetoke`,
      }),
    ]);
  } catch (err) {
    console.error(`[contact] Could not send the emails of message ${message.id}:`, err);
  }
}
