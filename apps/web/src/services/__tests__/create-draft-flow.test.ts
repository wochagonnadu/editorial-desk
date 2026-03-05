// PATH: apps/web/src/services/__tests__/create-draft-flow.test.ts
// WHAT: Service-level verification for strategy-to-draft flow wiring
// WHY:  Confirms copy/approve/create-draft sequence used by CreateDraft page
// RELEVANT: apps/web/src/services/topics.ts,apps/web/src/services/drafts.ts

import assert from 'node:assert/strict';
import test from 'node:test';

const mockWindowAndFetch = (responses: Array<{ status?: number; body: unknown }>) => {
  const originalFetch = globalThis.fetch;
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const originalWindow = (globalThis as { window?: unknown }).window;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { hostname: 'localhost', port: '5173', origin: 'http://localhost:5173' } },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const next = responses.shift() ?? { status: 200, body: {} };
    return new Response(JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
      if (hadWindow)
        Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
      else Reflect.deleteProperty(globalThis, 'window');
    },
  };
};

test('generate plan then copy item creates topic', async (t) => {
  const { calls, restore } = mockWindowAndFetch([
    { body: { horizon_weeks: 12, pillars: [], interlinking: [] } },
    { body: { id: 'topic-1', status: 'proposed' } },
  ]);
  t.after(restore);
  const { generateStrategyPlan, createTopic } = await import('../topics');

  await generateStrategyPlan('token-1', { expertId: 'e1', topicSeed: 'Implants FAQ' });
  await createTopic('token-1', {
    title: 'FAQ: Is implant painful?',
    expertId: 'e1',
    description: 'Week 1 FAQ item',
    sourceType: 'faq',
  });

  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/topics/strategy-plan');
  assert.equal(calls[1]?.url, 'http://localhost:3000/api/v1/topics');
  assert.match(String(calls[1]?.init?.body), /"source_type":"faq"/);
});

test('copy -> approve -> create draft returns draft id for open editor', async (t) => {
  const { calls, restore } = mockWindowAndFetch([
    { body: { id: 'topic-2', status: 'proposed' } },
    { body: { id: 'topic-2', status: 'approved' } },
    { body: { id: 'draft-9' } },
  ]);
  t.after(restore);
  const { createTopic, approveTopic } = await import('../topics');
  const { createDraftFromTopic } = await import('../drafts');

  const topicId = await createTopic('token-1', { title: 'Cluster topic', expertId: 'e1' });
  await approveTopic('token-1', topicId);
  const draftId = await createDraftFromTopic('token-1', topicId);

  assert.equal(draftId, 'draft-9');
  assert.equal(calls[1]?.url, 'http://localhost:3000/api/v1/topics/topic-2/approve');
  assert.equal(calls[2]?.url, 'http://localhost:3000/api/v1/drafts');
});
