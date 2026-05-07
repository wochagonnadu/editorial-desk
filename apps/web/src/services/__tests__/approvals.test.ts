// PATH: apps/web/src/services/__tests__/approvals.test.ts
// WHAT: Service-level tests for approvals API adapter
// WHY:  Protects queue, decision payloads, and API error propagation
// RELEVANT: apps/web/src/services/approvals.ts,apps/web/src/services/api/client.ts

import assert from 'node:assert/strict';
import test from 'node:test';
import { mockWindowAndFetch } from './test-utils';

test('fetchApprovals returns approval queue items', async (t) => {
  const { calls, restore } = mockWindowAndFetch(
    () =>
      new Response(
        JSON.stringify({
          data: [
            {
              stepId: 'step-1',
              draftId: 'draft-1',
              currentVersionId: 'version-1',
              draftTitle: 'Approval queue guide',
              reviewer: 'Reviewer One',
              status: 'pending',
              timeWaitingSec: 120,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  );
  t.after(restore);
  const { fetchApprovals } = await import('../approvals');

  const items = await fetchApprovals('token-1', 'reviewer');

  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/approvals?view=reviewer');
  assert.equal(items[0]?.stepId, 'step-1');
  assert.equal(items[0]?.status, 'pending');
});

test('decideApprovalStep sends approve payload with expected version', async (t) => {
  const { calls, restore } = mockWindowAndFetch(
    () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  t.after(restore);
  const { decideApprovalStep } = await import('../approvals');

  await decideApprovalStep('token-1', 'step-1', {
    action: 'approve',
    expectedCurrentVersionId: 'version-1',
  });

  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/approvals/step-1/decision');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.match(String(calls[0]?.init?.body), /"action":"approve"/);
  assert.match(String(calls[0]?.init?.body), /"expected_current_version_id":"version-1"/);
});

test('decideApprovalStep sends request_changes comment', async (t) => {
  const { calls, restore } = mockWindowAndFetch(
    () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  t.after(restore);
  const { decideApprovalStep } = await import('../approvals');

  await decideApprovalStep('token-1', 'step-1', {
    action: 'request_changes',
    expectedCurrentVersionId: 'version-1',
    comment: 'Need clearer CTA',
  });

  assert.match(String(calls[0]?.init?.body), /"action":"request_changes"/);
  assert.match(String(calls[0]?.init?.body), /"comment":"Need clearer CTA"/);
});

test('decideApprovalStep exposes API errors to callers', async (t) => {
  const { restore } = mockWindowAndFetch(
    () =>
      new Response(
        JSON.stringify({ error: { code: 'CONFLICT', message: 'Step already processed' } }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      ),
  );
  t.after(restore);
  const { ApiError } = await import('../api/client');
  const { decideApprovalStep } = await import('../approvals');

  await assert.rejects(
    () =>
      decideApprovalStep('token-1', 'step-1', {
        action: 'approve',
        expectedCurrentVersionId: 'version-1',
      }),
    (error) =>
      error instanceof ApiError &&
      error.status === 409 &&
      error.code === 'CONFLICT' &&
      error.message === 'Step already processed',
  );
});
