// PATH: services/api/tests/unit/auth-login-email-failure.test.ts
// WHAT: Verifies login route maps email transport failures to 502 response
// WHY:  Keeps auth failure mode explicit when provider TLS/network is broken
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/core/errors.ts,services/api/src/providers/email-resend.ts

import { Hono } from 'hono';
import type { ContentPort } from '@newsroom/shared';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import { buildAuthRoutes } from '../../src/routes/auth';
import type { RouteDeps } from '../../src/routes/deps';

const createDeps = (): RouteDeps => {
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { id: 'u1', companyId: 'c1', email: 'mail@mail.com', role: 'owner' as const },
          ],
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => [],
      }),
    }),
    insert: () => ({
      values: async () => [],
    }),
  } as unknown as RouteDeps['db'];

  const content: ContentPort = {
    streamText: async () => (async function* () {})(),
    generateObject: async <T>() => ({} as T),
  };

  return {
    db,
    content,
    logger: createLogger(),
    email: {
      buildReplyToAddress: () => 'reply@vsche.ru',
      sendEmail: async () => ({ messageId: 'ok' }),
      sendMagicLink: async () => {
        throw new Error('self-signed certificate in certificate chain');
      },
    },
  };
};

describe('auth login email failure', () => {
  const originalBypass = process.env.DEV_DISABLE_AUTH;
  const originalMock = process.env.DEV_MOCK_MAGIC_LINK;

  afterEach(() => {
    if (originalBypass === undefined) delete process.env.DEV_DISABLE_AUTH;
    else process.env.DEV_DISABLE_AUTH = originalBypass;
    if (originalMock === undefined) delete process.env.DEV_MOCK_MAGIC_LINK;
    else process.env.DEV_MOCK_MAGIC_LINK = originalMock;
  });

  it('returns 502 EMAIL_DELIVERY_FAILED', async () => {
    process.env.DEV_DISABLE_AUTH = 'false';
    process.env.DEV_MOCK_MAGIC_LINK = 'false';

    const app = new Hono();
    app.onError((error, context) => toErrorResponse(context, error));
    app.route('/', buildAuthRoutes(createDeps()));

    const response = await app.request('http://local/login', {
      method: 'POST',
      headers: { 'x-auth-email': 'mail@mail.com' },
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'EMAIL_DELIVERY_FAILED' },
    });
  });

  it('returns 400 VALIDATION_ERROR when x-auth-email is missing', async () => {
    process.env.DEV_DISABLE_AUTH = 'false';
    process.env.DEV_MOCK_MAGIC_LINK = 'false';

    const app = new Hono();
    app.onError((error, context) => toErrorResponse(context, error));
    app.route('/', buildAuthRoutes(createDeps()));

    const response = await app.request('http://local/login', {
      method: 'POST',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});
