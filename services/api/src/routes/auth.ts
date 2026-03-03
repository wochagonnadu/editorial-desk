// PATH: services/api/src/routes/auth.ts
// WHAT: Auth endpoints for magic-link login and verification
// WHY:  Supports email-first access with implicit company onboarding
// RELEVANT: services/api/src/routes/auth-token.ts,services/api/src/providers/email.ts

import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { Context } from 'hono';
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
  if (typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'email must be valid');
  }
  const email = value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email must be valid');
  }
  return email;
};

const companyNameFromEmail = (email: string): string => {
  const name = email.split('@')[1]?.split('.')[0] ?? 'company';
  return `Company ${name}`;
};

const maskEmailForLogs = (email: string): string => {
  const [local = '', domain = ''] = email.split('@');
  const maskedLocal =
    local.length <= 2 ? `${local.slice(0, 1)}*` : `${local.slice(0, 2)}***`;
  const [domainName = '', ...rest] = domain.split('.');
  const maskedDomain = domainName ? `${domainName.slice(0, 1)}***` : '***';
  const suffix = rest.length > 0 ? `.${rest.join('.')}` : '';
  return `${maskedLocal}@${maskedDomain}${suffix}`;
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';

const parseLoginEmail = (context: Context, deps: RouteDeps, startedAt: number): string => {
  const headerEmail = context.req.header('x-auth-email');
  if (!headerEmail) {
    throw new AppError(400, 'VALIDATION_ERROR', 'x-auth-email header is required');
  }
  deps.logger.info('auth.login.after_parse_email_header', {
    duration_ms_from_start: Date.now() - startedAt,
  });
  deps.logger.info('auth.login.email_source', {
    source: 'header',
    duration_ms_from_start: Date.now() - startedAt,
  });
  return parseEmail(headerEmail);
};

export const buildAuthRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  router.post('/login', async (context) => {
    const startedAt = Date.now();
    deps.logger.info('auth.login.enter', { duration_ms_from_start: 0 });
    const email = parseLoginEmail(context, deps, startedAt);
    const maskedEmail = maskEmailForLogs(email);
    deps.logger.info('auth.login.start', { email: maskedEmail });

    if (isDevAuthBypassEnabled()) {
      deps.logger.warn('auth.dev_bypass_login', { email: maskedEmail });
      return context.json({
        message: `DEV auth bypass enabled. Token: ${DEV_BYPASS_TOKEN}`,
        dev_magic_token: DEV_BYPASS_TOKEN,
      });
    }

    deps.logger.info('auth.login.before_user_select', {
      email: maskedEmail,
      duration_ms_from_start: Date.now() - startedAt,
    });
    let [user] = await deps.db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
    deps.logger.info('auth.login.after_user_select', {
      email: maskedEmail,
      found_user: Boolean(user),
      duration_ms_from_start: Date.now() - startedAt,
    });
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
      email: maskedEmail,
      user_id: user.id,
      created_user: createdUser,
    });

    const mockToken = await issueDevMockMagicLink(deps, { companyId: user.companyId, email });
    if (mockToken) {
      deps.logger.info('auth.login_link_sent_mock', { email: maskedEmail, token: mockToken });
      return context.json({ message: `DEV mock token: ${mockToken}`, dev_magic_token: mockToken });
    }

    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + Number(process.env.MAGIC_LINK_TTL_HOURS ?? 72) * 3600_000,
    );
    deps.logger.info('auth.login.before_notification_insert', {
      email: maskedEmail,
      duration_ms_from_start: Date.now() - startedAt,
    });
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
      email: maskedEmail,
      token,
      expires_at: expiresAt.toISOString(),
      duration_ms_from_start: Date.now() - startedAt,
    });
    try {
      deps.logger.info('auth.login.before_email_send', { email: maskedEmail });
      await deps.email.sendMagicLink({
        to: email,
        token,
        expiresAt,
        appUrl: process.env.APP_URL ?? 'http://localhost:5173',
      });
    } catch (error) {
      deps.logger.error('auth.login_email_send_failed', {
        email: maskedEmail,
        provider: (process.env.EMAIL_PROVIDER ?? 'stub').toLowerCase(),
        error: toErrorMessage(error),
      });
      throw new AppError(502, 'EMAIL_DELIVERY_FAILED', 'Failed to send login email');
    }
    deps.logger.info('auth.login.email_sent', { email: maskedEmail });
    deps.logger.info('auth.login_link_sent', { email: maskedEmail });
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
