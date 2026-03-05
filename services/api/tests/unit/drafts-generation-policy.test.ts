// PATH: services/api/tests/unit/drafts-generation-policy.test.ts
// WHAT: Verifies workspace generation policy is wired into draft generate/revise prompt vars
// WHY:  Protects stable editorial tone application across both LLM pipeline operations
// RELEVANT: services/api/src/routes/drafts/pipeline-create.ts,services/api/src/routes/drafts/pipeline-review.ts

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentPort } from '@newsroom/shared';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import {
  companyTable,
  draftTable,
  draftVersionTable,
  expertTable,
  topicTable,
  voiceProfileTable,
} from '../../src/providers/db';
import { generateDraft } from '../../src/routes/drafts/pipeline-create';
import { reviseDraft } from '../../src/routes/drafts/pipeline-review';
import type { RouteDeps } from '../../src/routes/deps';

vi.mock('../../src/core/drafts', () => ({
  createVersion: vi.fn(async () => ({ id: 'v2', versionNumber: 2, voiceScore: 0.8 })),
  transitionDraftStatus: vi.fn(async () => undefined),
}));

const queryResult = <T>(rows: T[]) => ({ limit: async () => rows });

const createDeps = (draft: { currentVersionId: string | null }, calls: unknown[]) =>
  ({
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === draftTable)
              return queryResult([
                {
                  id: 'd1',
                  topicId: 't1',
                  expertId: 'exp-1',
                  companyId: 'c1',
                  status: 'drafting',
                  ...draft,
                },
              ]);
            if (table === topicTable) return queryResult([{ id: 't1', title: 'Policy topic' }]);
            if (table === expertTable) return queryResult([{ id: 'exp-1', name: 'Expert One' }]);
            if (table === voiceProfileTable)
              return queryResult([
                {
                  expertId: 'exp-1',
                  status: 'confirmed',
                  profileData: { confidence: 0.9, profile_version: '1.0.0' },
                },
              ]);
            if (table === companyTable)
              return queryResult([
                {
                  id: 'c1',
                  generationPolicy: {
                    tone: 'calm compliance style',
                    default_audience: 'practitioners',
                    guardrails: {
                      must_include: ['next step'],
                      avoid: ['fear framing'],
                      banned_phrases: ['always works'],
                    },
                  },
                },
              ]);
            if (table === draftVersionTable)
              return queryResult([{ id: 'v1', content: 'Original draft content' }]);
            return queryResult([]);
          },
        }),
      }),
    } as unknown as RouteDeps['db'],
    content: {
      streamText: async (input) => {
        calls.push(input);
        return (async function* () {
          yield 'chunk';
        })();
      },
      generateObject: async <T>() => ({}) as T,
    } satisfies ContentPort,
    email: {
      sendEmail: async () => ({ messageId: 'm1' }),
      sendMagicLink: async () => ({ messageId: 'm1' }),
      buildReplyToAddress: () => 'x',
    },
    logger: createLogger(),
  }) as RouteDeps;

describe('draft generation policy wiring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes same workspace policy into both generate and revise', async () => {
    const generateCalls: unknown[] = [];
    const reviseCalls: unknown[] = [];
    const app = new Hono();
    app.use('*', async (c, next) => {
      (c as { set: (key: string, value: unknown) => void }).set('authUser', {
        userId: 'u1',
        companyId: 'c1',
        role: 'owner',
      });
      await next();
    });
    app.onError((error, context) => toErrorResponse(context, error));
    app.post(
      '/drafts/:id/generate',
      generateDraft(createDeps({ currentVersionId: null }, generateCalls)),
    );
    app.post(
      '/drafts/:id/revise',
      reviseDraft(createDeps({ currentVersionId: 'v1' }, reviseCalls)),
    );

    const generateResponse = await app.request('http://local/drafts/d1/generate', {
      method: 'POST',
    });
    const reviseResponse = await app.request('http://local/drafts/d1/revise', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instructions: 'Make it tighter' }),
    });

    expect(generateResponse.status).toBe(200);
    expect(reviseResponse.status).toBe(200);
    const generateVars = (generateCalls[0] as { promptVars?: Record<string, unknown> }).promptVars;
    const reviseVars = (reviseCalls[0] as { promptVars?: Record<string, unknown> }).promptVars;
    expect(generateVars?.audience).toBe('practitioners');
    expect(generateVars?.workspace_generation_policy_json).toBe(
      reviseVars?.workspace_generation_policy_json,
    );
  });
});
