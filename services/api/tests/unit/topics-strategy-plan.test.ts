// PATH: services/api/tests/unit/topics-strategy-plan.test.ts
// WHAT: Unit tests for structured strategy-plan API route
// WHY:  Verifies e2e route behavior for plan generation and fallback errors
// RELEVANT: services/api/src/routes/topics.ts,services/api/src/core/content-strategy-plan.ts

import { Hono } from 'hono';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import { buildTopicRoutes } from '../../src/routes/topics';
import type { RouteDeps } from '../../src/routes/deps';

const queryResult = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  limit: async (count: number) => rows.slice(0, count),
});

const createApp = (deps: RouteDeps) => {
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
  app.route('/topics', buildTopicRoutes(deps));
  return app;
};

describe('topics strategy-plan route', () => {
  it('generates plan and keeps copy_payload for topic creation', async () => {
    const deps = {
      db: {
        select: () => ({
          from: () => ({ where: () => queryResult([{ id: 'e1', name: 'Dr A' }]) }),
        }),
      },
      content: {
        streamText: async () => (async function* () {})(),
        generateObject: async () => ({
          pillars: [
            {
              title: 'P1',
              clusters: [{ title: 'C1', week: 1, copy_payload: { title: 'Topic C1' } }],
              faq: [
                { question: 'Q1', week: 1, copy_payload: { title: 'FAQ Q1', source_type: 'faq' } },
              ],
            },
          ],
          interlinking: [{ from_item_id: 'c1', to_item_id: 'f1', anchor_hint: 'see also' }],
        }),
      },
      logger: createLogger(),
      email: {
        sendEmail: async () => ({ messageId: '1' }),
        sendMagicLink: async () => ({ messageId: '1' }),
        buildReplyToAddress: () => 'x',
      },
    } as unknown as RouteDeps;
    const app = createApp(deps);

    const response = await app.request('http://local/topics/strategy-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expert_id: 'e1', topic_seed: 'Dental implants for busy adults' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      horizon_weeks: 12,
      pillars: [
        {
          clusters: [{ copy_payload: { title: 'Topic C1' } }],
          faq: [{ copy_payload: { title: 'FAQ Q1' } }],
        },
      ],
    });
  });

  it('returns LLM_UPSTREAM_ERROR for empty or invalid model output', async () => {
    const deps = {
      db: {
        select: () => ({
          from: () => ({ where: () => queryResult([{ id: 'e1', name: 'Dr A' }]) }),
        }),
      },
      content: {
        streamText: async () => (async function* () {})(),
        generateObject: async () => ({ pillars: [] }),
      },
      logger: createLogger(),
      email: {
        sendEmail: async () => ({ messageId: '1' }),
        sendMagicLink: async () => ({ messageId: '1' }),
        buildReplyToAddress: () => 'x',
      },
    } as unknown as RouteDeps;
    const app = createApp(deps);

    const response = await app.request('http://local/topics/strategy-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expert_id: 'e1', topic_seed: 'Dental implants for busy adults' }),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'LLM_UPSTREAM_ERROR' } });
  });
});
