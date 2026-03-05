// PATH: services/api/tests/unit/experts-profile-routes.test.ts
// WHAT: Unit tests for expert rich profile save/read routes
// WHY:  Locks validation, access guard, and audit behavior
// RELEVANT: services/api/src/routes/experts.ts,services/api/src/routes/expert-profile-validation.ts

import { Hono } from 'hono';
import type { ContentPort } from '@newsroom/shared';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import { buildExpertRoutes } from '../../src/routes/experts';
import type { RouteDeps } from '../../src/routes/deps';

const queryResult = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  limit: async (count: number) => rows.slice(0, count),
  returning: async () => rows,
});
const expert = {
  id: 'e1',
  companyId: 'c1',
  name: 'Dr',
  roleTitle: 'Dentist',
  email: 'x@x.com',
  domain: 'medical',
  publicTextUrls: [],
  status: 'active',
  createdAt: new Date(),
};

const createDeps = (selectQueue: unknown[][]) => {
  const audits: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: () => queryResult(selectQueue.shift() ?? []) }) }),
    update: () => ({ set: () => ({ where: () => queryResult([]) }) }),
    insert: () => ({
      values: (value: Record<string, unknown>) => (
        value.action === 'expert.profile_saved' && audits.push(value),
        queryResult([{ id: 'vp-1', ...value }])
      ),
    }),
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

const createApp = (deps: RouteDeps) => {
  const app = new Hono();
  app.use('*', async (context, next) => {
    (context as { set: (key: string, value: unknown) => void }).set('authUser', {
      userId: 'u-owner',
      companyId: 'c1',
      role: 'owner',
    });
    await next();
  });
  app.onError((error, context) => toErrorResponse(context, error));
  app.route('/experts', buildExpertRoutes(deps));
  return app;
};

describe('expert profile routes', () => {
  it('saves rich profile, reads profile, writes audit', async () => {
    const { deps, audits } = createDeps([
      [expert],
      [],
      [expert],
      [
        {
          profileData: {
            expert_setup_profile: {
              role: 'Dentist',
              tone: { primary: 'calm', secondary: [] },
              contacts: {},
              tags: [],
              sources: [],
              background: '',
            },
          },
          status: 'draft',
        },
      ],
    ]);
    const app = createApp(deps);
    const save = await app.request('http://local/experts/e1/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        profile: {
          role: 'Dentist',
          tone: { primary: 'calm', secondary: [] },
          contacts: {},
          tags: [],
          sources: ['https://example.com/a'],
          background: '',
        },
      }),
    });
    expect(save.status).toBe(200);
    const read = await app.request('http://local/experts/e1');
    await expect(read.json()).resolves.toMatchObject({
      profile: { role: 'Dentist', tone: { primary: 'calm' } },
    });
    expect(audits.length).toBe(1);
  });

  it('returns VALIDATION_ERROR and FORBIDDEN', async () => {
    const { deps } = createDeps([[expert], [], [{ id: 'e2' }]]);
    const app = createApp(deps);
    const invalid = await app.request('http://local/experts/e1/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        profile: { role: '', tone: { primary: '' }, contacts: {}, sources: ['http://bad.url'] },
      }),
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    const forbidden = await app.request('http://local/experts/e2/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        profile: {
          role: 'Dentist',
          tone: { primary: 'calm', secondary: [] },
          contacts: {},
          tags: [],
          sources: ['https://ok.dev'],
          background: '',
        },
      }),
    });
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });
});
