import { Router, type Request } from 'express';
import jwt from 'jsonwebtoken';
import { CONTACT_STATUSES, type ContactInfo, type ContactStatus } from '../../shared/contact.js';
import { contactSchema, contactStatusSchema } from '../../shared/schemas.js';
import { config } from '../config.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAdmin, requireAuth } from '../middleware/requireAuth.js';
import { ContactMessage, User } from '../models/index.js';
import { sendContactEmails } from '../services/mail.js';
import { ok } from '../services/response.js';

export const contactRoutes = Router();

const limit = rateLimit({ windowMs: 60 * 60 * 1000, max: config.contactRateLimit, message: 'Mandaste varios mensajes seguidos, probá de nuevo más tarde' });

/** The form is public, but a signed-in sender gets linked to the message. */
async function optionalUserId(req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, config.jwtSecret) as { id: string };
    return (await User.findByPk(id))?.id ?? null;
  } catch {
    return null;
  }
}

// Public: contact channels
contactRoutes.get('/info', (_req, res) => {
  const info: ContactInfo = config.contact;
  ok(res, info);
});

// Public: receive a message from the contact form
contactRoutes.post('/', limit, asyncHandler(async (req, res) => {
  const { company, consent: _consent, ...data } = contactSchema.parse(req.body);

  // Bots fill in the hidden field: answer as usual and drop the message.
  if (!company) {
    const message = await ContactMessage.create({
      ...data,
      ip: req.ip ?? null,
      userAgent: req.get('user-agent')?.slice(0, 512) ?? null,
      userId: await optionalUserId(req),
    });
    await sendContactEmails(message);
  }

  ok(res, { received: true }, 201);
}));

// Admin: paginated list, newest first. Filters: status
contactRoutes.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const status = req.query.status as ContactStatus | undefined;

  const { rows, count } = await ContactMessage.findAndCountAll({
    where: status && CONTACT_STATUSES.includes(status) ? { status } : {},
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  ok(res, { items: rows, total: count, page, pages: Math.ceil(count / limit) });
}));

// Admin: change the status of a message
contactRoutes.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { status } = contactStatusSchema.parse(req.body);
  const message = await ContactMessage.findByPk(req.params.id);
  if (!message) throw new HttpError(404, 'No encontramos ese mensaje');

  await message.update({ status });
  ok(res, message);
}));
