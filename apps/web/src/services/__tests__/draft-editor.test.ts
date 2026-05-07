// PATH: apps/web/src/services/__tests__/draft-editor.test.ts
// WHAT: Service-level tests for draft editor load/save flows
// WHY:  Protects local draft text from failed save API responses
// RELEVANT: apps/web/src/services/drafts.ts,apps/web/src/pages/draft-editor/save-draft-editor-content.ts

import assert from 'node:assert/strict';
import test from 'node:test';
import type { DraftDetail } from '../drafts';

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

const createDraftDetail = (overrides: Partial<DraftDetail> = {}): DraftDetail => ({
  id: 'draft-1',
  status: 'drafting',
  topicTitle: 'Implants FAQ',
  expertName: 'Dr. Example',
  expertId: 'expert-1',
  content: 'Loaded draft text',
  summary: 'Loaded summary',
  currentVersionId: 'version-1',
  currentVersionNumber: 1,
  comments: [],
  hasCompletedFactcheck: false,
  publishPlan: { scheduledPublishAt: null, timezone: null, isScheduled: false },
  factcheckResults: [],
  ...overrides,
});

test('draft editor loads draft detail and versions', async (t) => {
  const { restore } = mockWindowAndFetch([
    {
      body: {
        id: 'draft-1',
        status: 'drafting',
        topic: { title: 'Implants FAQ' },
        expert: { id: 'expert-1', name: 'Dr. Example' },
        currentVersion: {
          id: 'version-1',
          versionNumber: 1,
          content: 'Loaded draft text',
          summary: 'Loaded summary',
        },
        comments: [],
      },
    },
    {
      body: {
        data: [
          {
            id: 'version-1',
            versionNumber: 1,
            summary: 'Loaded summary',
            content: 'Loaded draft text',
            createdAt: '2026-05-01T10:00:00.000Z',
          },
        ],
      },
    },
  ]);
  t.after(restore);
  const { fetchDraftDetail, fetchDraftVersions } = await import('../drafts');

  const detail = await fetchDraftDetail('token-1', 'draft-1');
  const versions = await fetchDraftVersions('token-1', 'draft-1');

  assert.equal(detail.content, 'Loaded draft text');
  assert.equal(detail.currentVersionId, 'version-1');
  assert.equal(versions[0]?.content, 'Loaded draft text');
});

test('draft editor save sends content with expected current version', async (t) => {
  const { calls, restore } = mockWindowAndFetch([{ body: { id: 'version-2', version_number: 2 } }]);
  t.after(restore);
  const { saveDraftVersion } = await import('../drafts');

  await saveDraftVersion('token-1', 'draft-1', {
    content: 'Edited draft text',
    summary: 'Edited summary',
    expectedCurrentVersionId: 'version-1',
  });

  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/drafts/draft-1/versions');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.match(String(calls[0]?.init?.body), /"content":"Edited draft text"/);
  assert.match(String(calls[0]?.init?.body), /"expected_current_version_id":"version-1"/);
});

test('draft editor save reports API error and keeps local text', async () => {
  const { saveDraftEditorContent, DRAFT_SAVE_ERROR } = await import(
    '../../pages/draft-editor/save-draft-editor-content'
  );
  const detail = createDraftDetail();
  let editorText = 'Unsaved text stays in editor';
  let reloads = 0;

  const result = await saveDraftEditorContent({
    token: 'token-1',
    detail,
    content: editorText,
    saveVersion: async () => {
      throw new Error('API failed');
    },
    reload: async () => {
      reloads += 1;
      editorText = detail.content;
    },
  });

  assert.deepEqual(result, { ok: false, error: DRAFT_SAVE_ERROR });
  assert.equal(reloads, 0);
  assert.equal(editorText, 'Unsaved text stays in editor');
});
