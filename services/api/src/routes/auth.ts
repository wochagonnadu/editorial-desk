// PATH: services/api/src/routes/auth.ts
// WHAT: Auth endpoints for magic-link login and verification
// WHY:  Supports email-first access with implicit company onboarding
// RELEVANT: services/api/src/routes/auth-token.ts,services/api/src/providers/email.ts

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { logAudit } from '../core/audit';
import { AppError } from '../core/errors';
import { companyTable, notificationTable, userTable } from '../providers/db';
import { signSessionToken } from './auth-token';
import type { RouteDeps } from './deps';
const parseEmail = (value: unknown): string => {
  if (typeof value !== 'string' || !value.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email must be valid');
  }
  return value.trim().toLowerCase();
};
const companyNameFromEmail = (email: string): string => {
  const name = email.split('@')[1]?.split('.')[0] ?? 'company';
  return `Company ${name}`;
};
export const buildAuthRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  router.post('/login', async (context) => {
    const body = await context.req.json();
    const email = parseEmail((body as { email?: unknown }).email);

    let [user] = await deps.db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
    if (!user) {
      const [company] = await deps.db
        .insert(companyTable)
        .values({ name: companyNameFromEmail(email), domain: 'business', language: 'ru' })
        .returning();
      [user] = await deps.db
        .insert(userTable)
        .values({ companyId: company.id, email, name: email.split('@')[0] ?? 'Owner', role: 'owner' })
        .returning();
      await logAudit(deps.db, {
        companyId: company.id,
        actorType: 'system',
        action: 'user.created',
        entityType: 'user',
        entityId: user.id,
      });
    }
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + Number(process.env.MAGIC_LINK_TTL_HOURS ?? 72) * 3600_000);
    await deps.db.insert(notificationTable).values({
      companyId: user.companyId,
      recipientEmail: email,
      notificationType: 'magic_link',
      emailToken: randomUUID(),
      magicLinkToken: token,
      magicLinkExpiresAt: expiresAt,
      magicLinkRevoked: false,
      status: 'sent',
      sentAt: new Date(),
    });
    await deps.email.sendMagicLink({
      to: email,
      token,
      expiresAt,
      appUrl: process.env.APP_URL ?? 'http://localhost:5173',
    });
    deps.logger.info('auth.login_link_sent', { email });
    return context.json({ message: 'Login link sent to email' });
  });
  router.get('/verify', async (context) => {
    const token = context.req.query('token');
    if (!token) throw new AppError(400, 'VALIDATION_ERROR', 'token is required');

    const [notification] = await deps.db
      .select()
      .from(notificationTable)
      .where(eq(notificationTable.magicLinkToken, token))
      .limit(1);
    if (!notification || notification.magicLinkRevoked || !notification.magicLinkExpiresAt) {
      throw new AppError(401, 'INVALID_TOKEN', 'Magic link is invalid');
    }
    if (notification.magicLinkExpiresAt.getTime() < Date.now()) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Magic link expired');
    }
    const [user] = await deps.db
      .select()
      .from(userTable)
      .where(eq(userTable.email, notification.recipientEmail))
      .limit(1);
    if (!user) throw new AppError(401, 'INVALID_TOKEN', 'User not found for token');
    const jwt = await signSessionToken({ userId: user.id, companyId: user.companyId, role: user.role as 'owner' | 'manager' });
    return context.json({ token: jwt, user: { id: user.id, email: user.email, role: user.role, company_id: user.companyId } });
  });
  return router;
};
