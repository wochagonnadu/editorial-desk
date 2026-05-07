// PATH: services/api/tests/integration/manager-onboarding-api.test.ts
// WHAT: API happy-path test for manager onboarding setup and completion
// WHY:  Locks first-run manager flow without touching a real database
// RELEVANT: services/api/src/routes/users.ts,services/api/src/routes/companies.ts,services/api/src/routes/team.ts

import { Hono } from 'hono';
import type { ContentPort } from '@newsroom/shared';
import { describe, expect, it, vi } from 'vitest';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import {
  auditLogTable,
  companyTable,
  notificationTable,
  userTable,
} from '../../src/providers/db';
import { buildCompanyRoutes } from '../../src/routes/companies';
import type { RouteDeps } from '../../src/routes/deps';
import { buildTeamRoutes } from '../../src/routes/team';
import { buildUserRoutes } from '../../src/routes/users';

const queryResult = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  limit: async (count: number) => rows.slice(0, count),
  orderBy: () => ({ limit: async (count: number) => rows.slice(0, count) }),
  returning: async () => rows,
});

type MockUser = {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
  onboardingStatus: string;
  onboardingCurrentStep: string | null;
  onboardingStartedAt: Date | null;
  onboardingSkippedAt: Date | null;
  onboardingCompletedAt: Date | null;
};

const createDeps = () => {
  let company = {
    id: 'c1',
    name: 'Draft Desk',
    domain: 'business',
    description: '',
    language: 'en',
    setupCompletedAt: null as Date | null,
    generationPolicy: {},
  };
  let users: MockUser[] = [
    {
      id: 'u-owner',
      companyId: 'c1',
      email: 'owner@desk.dev',
      name: 'Owner',
      role: 'owner',
      onboardingStatus: 'not_started',
      onboardingCurrentStep: 'welcome',
      onboardingStartedAt: null as Date | null,
      onboardingSkippedAt: null as Date | null,
      onboardingCompletedAt: null as Date | null,
    },
  ];
  const notifications: unknown[] = [];
  const audits: unknown[] = [];
  let userSelectCount = 0;

  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => {
          if (table === companyTable) return queryResult([company]);
          if (table === notificationTable) return queryResult([]);
          if (table === userTable) {
            userSelectCount += 1;
            return queryResult(userSelectCount === 3 ? [] : users);
          }
          return queryResult([]);
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            if (table === companyTable) {
              company = { ...company, ...values };
              return [company];
            }
            if (table === userTable) {
              users = users.map((user) => (user.id === 'u-owner' ? { ...user, ...values } : user));
              return [users[0]];
            }
            return [];
          },
          then: (resolve: (value: unknown) => unknown) => {
            if (table === companyTable) company = { ...company, ...values };
            if (table === userTable) {
              users = users.map((user) => (user.id === 'u-owner' ? { ...user, ...values } : user));
            }
            return resolve(undefined);
          },
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (value: Record<string, unknown>) => {
        if (table === userTable) {
          const user: MockUser = {
            id: `u-${users.length + 1}`,
            companyId: String(value.companyId),
            email: String(value.email),
            name: String(value.name),
            role: String(value.role),
            onboardingStatus: 'not_started',
            onboardingCurrentStep: 'welcome',
            onboardingStartedAt: null,
            onboardingSkippedAt: null,
            onboardingCompletedAt: null,
          };
          users = [...users, user];
          return queryResult([user]);
        }
        if (table === notificationTable) {
          const notification = { id: `inv-${notifications.length + 1}`, ...value };
          notifications.push(notification);
          return queryResult([notification]);
        }
        if (table === auditLogTable) audits.push(value);
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
        buildReplyToAddress: () => 'reply@desk.dev',
        sendEmail: vi.fn(async () => ({ messageId: 'm-1' })),
        sendMagicLink: vi.fn(async () => ({ messageId: 'invite-1' })),
      },
    } as RouteDeps,
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
  app.route('/companies', buildCompanyRoutes(deps));
  app.route('/team', buildTeamRoutes(deps));
  app.route('/users', buildUserRoutes(deps));
  return app;
};

describe('manager onboarding API happy path', () => {
  it('saves setup choices, invites team, and completes onboarding', async () => {
    const { deps } = createDeps();
    const app = createApp(deps);

    const initial = await app.request('http://local/users/me/onboarding');
    expect(initial.status).toBe(200);
    await expect(initial.json()).resolves.toMatchObject({ status: 'not_started' });

    const workspaceBasics = await app.request('http://local/companies/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Clinical Desk',
        domain: 'medical',
        description: 'Evidence-based newsroom for patient education',
        language: 'ru',
      }),
    });
    expect(workspaceBasics.status).toBe(200);

    const teamInvite = await app.request('http://local/team/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@desk.dev',
        name: 'Managing Editor',
        role: 'manager',
      }),
    });
    expect(teamInvite.status).toBe(200);
    await expect(teamInvite.json()).resolves.toMatchObject({
      email: 'manager@desk.dev',
      role: 'manager',
      status: 'pending',
    });

    const generationSettings = await app.request('http://local/companies/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generation_policy: {
          tone: 'calm, practical, evidence-based',
          default_audience: 'practitioners',
          guardrails: {
            must_include: ['source context'],
            avoid: ['hype'],
            banned_phrases: ['guaranteed cure'],
          },
        },
      }),
    });
    expect(generationSettings.status).toBe(200);

    const complete = await app.request('http://local/users/me/onboarding', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    expect(complete.status).toBe(200);
    await expect(complete.json()).resolves.toMatchObject({
      status: 'completed',
      current_step: 'welcome',
      completed_at: expect.any(String),
    });

    const savedCompany = await app.request('http://local/companies/me');
    await expect(savedCompany.json()).resolves.toMatchObject({
      name: 'Clinical Desk',
      domain: 'medical',
      description: 'Evidence-based newsroom for patient education',
      language: 'ru',
      generation_policy: {
        tone: 'calm, practical, evidence-based',
        default_audience: 'practitioners',
        guardrails: {
          must_include: ['source context'],
          avoid: ['hype'],
          banned_phrases: ['guaranteed cure'],
        },
      },
    });

    const savedTeam = await app.request('http://local/team/users');
    await expect(savedTeam.json()).resolves.toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ email: 'manager@desk.dev', role: 'manager' }),
      ]),
    });
  });
});
