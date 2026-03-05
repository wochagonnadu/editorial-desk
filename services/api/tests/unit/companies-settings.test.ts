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
  const company = {
    id: 'c1',
    name: 'Old',
    domain: 'business',
    language: 'en',
    generationPolicy: {
      tone: 'clear, calm, practical',
      default_audience: 'general',
      guardrails: {
        must_include: ['actionable advice'],
        avoid: ['hype wording'],
        banned_phrases: ['100% guaranteed'],
      },
    },
  };
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
      body: JSON.stringify({
        name: 'New Name',
        domain: 'medical',
        language: 'ru',
        generation_policy: {
          tone: 'calm, practical, no hype for regulated readers',
          guardrails: { banned_phrases: ['always works'] },
        },
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      name: 'New Name',
      domain: 'medical',
      language: 'ru',
      generation_policy: {
        tone: 'calm, practical, no hype for regulated readers',
      },
    });
    expect(audits.length).toBe(1);
    const audit = audits[0] as {
      metadata?: {
        changed_fields?: string[];
        generation_policy_changed?: boolean;
        generation_policy_changed_sections?: string[];
      };
    };
    expect(audit.metadata?.changed_fields).toContain('generation_policy');
    expect(audit.metadata?.generation_policy_changed).toBe(true);
    expect(audit.metadata?.generation_policy_changed_sections).toEqual([
      'tone',
      'guardrails.banned_phrases',
    ]);
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

  it('returns VALIDATION_ERROR for invalid generation policy payload', async () => {
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
    app.route('/companies', buildCompanyRoutes(deps));

    const response = await app.request('http://local/companies/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generation_policy: { default_audience: 'advanced' },
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns generation preview without draft writes', async () => {
    const { deps } = createDeps();
    deps.content.streamText = async () =>
      (async function* () {
        yield '# Preview';
      })();
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

    const response = await app.request('http://local/companies/me/generation-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expert_id: 'exp-1',
        topic_title: 'How to choose first consultation',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sample_markdown: '# Preview',
      meta: { use_case: 'draft.generate', prompt_id: 'drafts.generate.base' },
      applied_policy: { default_audience: 'general' },
    });
  });
});
