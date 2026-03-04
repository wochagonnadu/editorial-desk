// PATH: services/api/tests/unit/companies-settings.test.ts
// WHAT: Endpoint tests for PATCH /companies/me settings update contract
// WHY:  Locks owner-only write behavior, validation, and audit side effect
// RELEVANT: services/api/src/routes/companies.ts,services/api/src/core/audit.ts

import { Hono } from 'hono';
import type { ContentPort } from '@newsroom/shared';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import { buildCompanyRoutes } from '../../src/routes/companies';
import type { RouteDeps } from '../../src/routes/deps';

const queryResult = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  limit: async (count: number) => rows.slice(0, count),
  returning: async () => rows,
});

const createDeps = () => {
  const company = { id: 'c1', name: 'Old', domain: 'business', language: 'en' };
  const audits: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: () => queryResult([company]) }) }),
    update: () => ({
      set: (values: Partial<typeof company>) => ({
        where: () => queryResult([{ ...company, ...values }]),
      }),
    }),
    insert: () => ({ values: (value: unknown) => (audits.push(value), queryResult([])) }),
  } as unknown as RouteDeps['db'];
  const content: ContentPort = {
    streamText: async () => (async function* () {})(),
    generateObject: async <T>() => ({}) as T,
  };
  return {
    deps: {
      db,
      content,
      logger: createLogger(),
      email: {
        buildReplyToAddress: () => 'x',
        sendEmail: async () => ({ messageId: '1' }),
        sendMagicLink: async () => ({ messageId: '1' }),
      },
    } as RouteDeps,
    audits,
  };
};

describe('companies settings endpoint', () => {
  it('updates company for owner and writes audit', async () => {
    const { deps, audits } = createDeps();
    const app = new Hono();
    app.use('*', async (context, next) => {
      (context as { set: (key: string, value: unknown) => void }).set('authUser', {
        userId: 'u1',
        companyId: 'c1',
        role: 'owner',
      });
      await next();
    });
    app.onError((error, context) => toErrorResponse(context, error));
    app.route('/companies', buildCompanyRoutes(deps));

    const response = await app.request('http://local/companies/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', domain: 'medical', language: 'ru' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      name: 'New Name',
      domain: 'medical',
      language: 'ru',
    });
    expect(audits.length).toBe(1);
  });

  it('returns FORBIDDEN for manager role', async () => {
    const { deps } = createDeps();
    const app = new Hono();
    app.use('*', async (context, next) => {
      (context as { set: (key: string, value: unknown) => void }).set('authUser', {
        userId: 'u2',
        companyId: 'c1',
        role: 'manager',
      });
      await next();
    });
    app.onError((error, context) => toErrorResponse(context, error));
    app.route('/companies', buildCompanyRoutes(deps));

    const response = await app.request('http://local/companies/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Blocked' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });
});
