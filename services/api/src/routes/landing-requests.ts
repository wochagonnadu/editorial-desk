// PATH: services/api/src/routes/landing-requests.ts
// WHAT: Public endpoint for landing page "Request Beta Access" submissions
// WHY:  Closes backend gap so CTA form sends real request data
// RELEVANT: services/api/src/routes/index.ts,specs/003-frontend-snapshot-import/api-compat-matrix.md

import { Hono } from 'hono';
import { AppError } from '../core/errors';
import type { RouteDeps } from './deps';

const parseRequired = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length < 2) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} is required`);
  }
  return value.trim();
};

const parseEmail = (value: unknown): string => {
  const email = parseRequired(value, 'email').toLowerCase();
  if (!email.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email must be valid');
  }
  return email;
};

export const buildLandingRequestRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.post('/requests', async (context) => {
    const body = (await context.req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = parseRequired(body.name, 'name');
    const email = parseEmail(body.email);
    const company = typeof body.company === 'string' ? body.company.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    const inbox = process.env.LANDING_REQUEST_INBOX ?? process.env.EMAIL_INBOUND_ADDRESS;
    if (!inbox) {
      throw new AppError(500, 'CONFIG_ERROR', 'Landing request inbox is not configured');
    }

    await deps.email.sendEmail({
      to: inbox,
      subject: `New Landing Request: ${name}`,
      textBody: `Name: ${name}\nEmail: ${email}\nCompany: ${company || '-'}\nMessage: ${message || '-'}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Company:</strong> ${company || '-'}</p><p><strong>Message:</strong> ${message || '-'}</p>`,
    });

    deps.logger.info('landing.request.created', {
      email,
      has_company: Boolean(company),
      has_message: Boolean(message),
    });

    return context.json({ ok: true }, 201);
  });

  return router;
};
