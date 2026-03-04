// PATH: services/api/tests/unit/team-routes.test.ts
// WHAT: Endpoint tests for team users, role updates, and invite flow
// WHY:  Protects new team contracts and edge rules for idempotency/self-role
// RELEVANT: services/api/src/routes/team.ts,services/api/src/routes/team-invites.ts

import { Hono } from 'hono';
import type { ContentPort } from '@newsroom/shared';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import { buildTeamRoutes } from '../../src/routes/team';
import type { RouteDeps } from '../../src/routes/deps';

const queryResult = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  limit: async (count: number) => rows.slice(0, count),
  orderBy: () => ({ limit: async (count: number) => rows.slice(0, count) }),
  returning: async () => rows,
});

const createDeps = (selectQueue: unknown[][]) => {
  const notifications: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: () => queryResult(selectQueue.shift() ?? []) }) }),
    update: () => ({ set: () => ({ where: () => queryResult([]), returning: async () => [] }) }),
    insert: () => ({
      values: (value: Record<string, unknown>) => {
        if (value.notificationType === 'team_invite') {
          const row = { id: `inv-${notifications.length + 1}`, ...value };
          notifications.push(row);
          return queryResult([row]);
        }
        if (value.email && value.companyId) return queryResult([{ id: 'u-new', ...value }]);
        return queryResult([]);
      },
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
        sendMagicLink: async () => ({ messageId: 'invite-1' }),
      },
    } as RouteDeps,
    notifications,
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
  app.route('/team', buildTeamRoutes(deps));
  return app;
};

describe('team routes', () => {
  it('lists team users and updates role', async () => {
    const { deps } = createDeps([
      [{ id: 'u-manager', name: 'M', email: 'm@x.com', role: 'manager' }],
      [{ id: 'u-manager', name: 'M', email: 'm@x.com', role: 'manager' }],
    ]);
    const app = createApp(deps);

    const listResponse = await app.request('http://local/team/users');
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({ data: [{ id: 'u-manager' }] });

    const roleResponse = await app.request('http://local/team/users/u-manager/role', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'owner' }),
    });
    expect(roleResponse.status).toBe(200);
  });

  it('reuses pending invite and blocks self role change', async () => {
    const { deps } = createDeps([
      [],
      [],
      [{ id: 'u-new', companyId: 'c1', email: 'new@x.com', role: 'manager' }],
      [{ id: 'inv-1', magicLinkToken: 'token-1' }],
    ]);
    const app = createApp(deps);

    const firstInvite = await app.request('http://local/team/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'new@x.com', role: 'manager', name: 'New User' }),
    });
    expect(firstInvite.status).toBe(200);
    const secondInvite = await app.request('http://local/team/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'new@x.com', role: 'manager', name: 'New User' }),
    });
    await expect(secondInvite.json()).resolves.toMatchObject({ reused: true });

    const selfRole = await app.request('http://local/team/users/u-owner/role', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'manager' }),
    });
    expect(selfRole.status).toBe(409);
    await expect(selfRole.json()).resolves.toMatchObject({ error: { code: 'CONFLICT' } });
  });
});
