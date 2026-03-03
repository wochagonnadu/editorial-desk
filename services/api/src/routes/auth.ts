// PATH: services/api/src/routes/auth.ts
// WHAT: Auth endpoints for magic-link login and verification
// WHY:  Supports email-first access with implicit company onboarding
// RELEVANT: services/api/src/routes/auth-token.ts,services/api/src/providers/email.ts

import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { logAudit } from '../core/audit.js';
import { AppError } from '../core/errors.js';
import { companyTable, notificationTable, userTable } from '../providers/db/index.js';
import {
  DEV_BYPASS_TOKEN,
  getDevAuthEmail,
  getDevAuthPayload,
  isDevAuthBypassEnabled,
} from './auth-dev.js';
import { issueDevMockMagicLink } from './auth-dev-mock.js';
import { signSessionToken } from './auth-token.js';
import type { RouteDeps } from './deps.js';

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

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';

export const buildAuthRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  router.post('/login', async (context) => {
    const body = await context.req.json();
    const email = parseEmail((body as { email?: unknown }).email);
    deps.logger.info('auth.login.start', { email });

    if (isDevAuthBypassEnabled()) {
      deps.logger.warn('auth.dev_bypass_login', { email });
      return context.json({
        message: `DEV auth bypass enabled. Token: ${DEV_BYPASS_TOKEN}`,
        dev_magic_token: DEV_BYPASS_TOKEN,
      });
    }

    let [user] = await deps.db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
    let createdUser = false;
    if (!user) {
      const [company] = await deps.db
        .insert(companyTable)
        .values({
          name: companyNameFromEmail(email),
          domain: 'business',
        } as unknown as typeof companyTable.$inferInsert)
        .returning();
      [user] = await deps.db
        .insert(userTable)
        .values({
          companyId: company.id,
          email,
          name: email.split('@')[0] ?? 'Owner',
          role: 'owner',
        } as unknown as typeof userTable.$inferInsert)
        .returning();
      await logAudit(deps.db, {
        companyId: company.id,
        actorType: 'system',
        action: 'user.created',
        entityType: 'user',
        entityId: user.id,
      });
      createdUser = true;
    }
    deps.logger.info('auth.login.after_user_lookup', {
      email,
      user_id: user.id,
      created_user: createdUser,
    });

    const mockToken = await issueDevMockMagicLink(deps, { companyId: user.companyId, email });
    if (mockToken) {
      deps.logger.info('auth.login_link_sent_mock', { email, token: mockToken });
      return context.json({ message: `DEV mock token: ${mockToken}`, dev_magic_token: mockToken });
    }

    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + Number(process.env.MAGIC_LINK_TTL_HOURS ?? 72) * 3600_000,
    );
    await deps.db
      .update(notificationTable)
      .set({ magicLinkRevoked: true } as Partial<typeof notificationTable.$inferInsert>)
      .where(
        and(
          eq(notificationTable.recipientEmail, email),
          eq(notificationTable.notificationType, 'magic_link'),
          eq(notificationTable.magicLinkRevoked, false),
        ),
      );
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
    } as unknown as typeof notificationTable.$inferInsert);
    deps.logger.info('auth.login.after_token_store', {
      email,
      token,
      expires_at: expiresAt.toISOString(),
    });
    try {
      deps.logger.info('auth.login.before_email_send', { email });
      await deps.email.sendMagicLink({
        to: email,
        token,
        expiresAt,
        appUrl: process.env.APP_URL ?? 'http://localhost:5173',
      });
    } catch (error) {
      deps.logger.error('auth.login_email_send_failed', {
        email,
        provider: (process.env.EMAIL_PROVIDER ?? 'stub').toLowerCase(),
        error: toErrorMessage(error),
      });
      throw new AppError(502, 'EMAIL_DELIVERY_FAILED', 'Failed to send login email');
    }
    deps.logger.info('auth.login.email_sent', { email });
    deps.logger.info('auth.login_link_sent', { email });
    return context.json({ message: 'Login link sent to email' });
  });
  router.get('/verify', async (context) => {
    const token = context.req.query('token');
    if (!token) throw new AppError(400, 'VALIDATION_ERROR', 'token is required');

    if (isDevAuthBypassEnabled()) {
      const payload = getDevAuthPayload();
      const jwt = await signSessionToken(payload);
      deps.logger.warn('auth.dev_bypass_verify', { token });
      return context.json({
        token: jwt,
        user: {
          id: payload.userId,
          email: getDevAuthEmail(),
          role: payload.role,
          company_id: payload.companyId,
        },
      });
    }

    const [notification] = await deps.db
      .select()
      .from(notificationTable)
      .where(eq(notificationTable.magicLinkToken, token))
      .orderBy(desc(notificationTable.createdAt))
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

    const [consumed] = await deps.db
      .update(notificationTable)
      .set({
        magicLinkRevoked: true,
        status: 'replied',
        repliedAt: new Date(),
      } as Partial<typeof notificationTable.$inferInsert>)
      .where(
        and(
          eq(notificationTable.id, notification.id),
          eq(notificationTable.magicLinkRevoked, false),
        ),
      )
      .returning({ id: notificationTable.id });
    if (!consumed) throw new AppError(401, 'INVALID_TOKEN', 'Magic link is invalid');

    const jwt = await signSessionToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role as 'owner' | 'manager',
    });
    return context.json({
      token: jwt,
      user: { id: user.id, email: user.email, role: user.role, company_id: user.companyId },
    });
  });
  return router;
};
