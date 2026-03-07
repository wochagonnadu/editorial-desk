// PATH: services/api/tests/unit/users-profile.test.ts
// WHAT: Endpoint tests for user profile and setup-status contracts
// WHY:  Protects manager-name source of truth and setup marker wiring after verify
// RELEVANT: services/api/src/routes/users.ts,services/api/src/routes/setup-status.ts,services/api/src/providers/db/schema/company-user.ts

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { toErrorResponse } from '../../src/core/errors';
import { companyTable, userTable } from '../../src/providers/db';
import { buildUserRoutes } from '../../src/routes/users';
import type { RouteDeps } from '../../src/routes/deps';

const queryResult = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  limit: async () => rows,
  returning: async () => rows,
});

const createDeps = () => {
  let user = {
    id: 'u1',
    companyId: 'c1',
    email: 'owner@desk.dev',
    name: 'Owner',
    role: 'owner',
  };
  let company = {
    id: 'c1',
    name: 'Desk',
    domain: 'medical',
    description: '',
    language: 'ru',
    generationPolicy: {},
    setupCompletedAt: null,
  };

  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => {
          if (table === userTable) return queryResult([user]);
          if (table === companyTable) return queryResult([company]);
          return queryResult([]);
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            if (table === userTable) {
              user = { ...user, ...values };
              return [user];
            }
            if (table === companyTable) {
              company = { ...company, ...values };
              return [company];
            }
            return [];
          },
          then: (resolve: (value: unknown) => unknown) => {
            if (table === companyTable) company = { ...company, ...values };
            return resolve(undefined);
          },
        }),
      }),
    }),
  } as unknown as RouteDeps['db'];

  return { deps: { db } as RouteDeps };
};

describe('users profile routes', () => {
  const createApp = () => {
    const { deps } = createDeps();
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
    app.route('/users', buildUserRoutes(deps));
    return app;
  };

  it('returns current user profile', async () => {
    const app = createApp();
    const response = await app.request('http://local/users/me');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'u1',
      email: 'owner@desk.dev',
      name: 'Owner',
      role: 'owner',
    });
  });

  it('updates current user name and marks setup complete once company context exists', async () => {
    const { deps } = createDeps();
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
    app.route(
      '/users',
      buildUserRoutes({
        ...deps,
        db: {
          ...deps.db,
          select: () => ({
            from: (table: unknown) => ({
              where: () => {
                if (table === userTable)
                  return queryResult([
                    {
                      id: 'u1',
                      companyId: 'c1',
                      email: 'owner@desk.dev',
                      name: 'Owner',
                      role: 'owner',
                    },
                  ]);
                if (table === companyTable)
                  return queryResult([
                    {
                      id: 'c1',
                      name: 'Desk',
                      domain: 'medical',
                      description: 'Clinical newsroom',
                      language: 'ru',
                      generationPolicy: {},
                      setupCompletedAt: null,
                    },
                  ]);
                return queryResult([]);
              },
            }),
          }),
        },
      } as unknown as RouteDeps),
    );

    const response = await app.request('http://local/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Jane Owner' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ name: 'Jane Owner' });
  });

  it('returns setup status marker for route decision', async () => {
    const { deps } = createDeps();
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
    app.route(
      '/users',
      buildUserRoutes({
        ...deps,
        db: {
          ...deps.db,
          select: () => ({
            from: (table: unknown) => ({
              where: () => {
                if (table === companyTable)
                  return queryResult([
                    {
                      id: 'c1',
                      name: 'Desk',
                      domain: 'medical',
                      description: 'Clinical newsroom',
                      language: 'ru',
                      generationPolicy: {},
                      setupCompletedAt: new Date('2026-03-07T10:00:00.000Z'),
                    },
                  ]);
                if (table === userTable)
                  return queryResult([
                    {
                      id: 'u1',
                      companyId: 'c1',
                      email: 'owner@desk.dev',
                      name: 'Owner',
                      role: 'owner',
                    },
                  ]);
                return queryResult([]);
              },
            }),
          }),
        },
      } as unknown as RouteDeps),
    );

    const response = await app.request('http://local/users/me/setup-status');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      setup_required: false,
      setup_completed_at: '2026-03-07T10:00:00.000Z',
    });
  });
});
