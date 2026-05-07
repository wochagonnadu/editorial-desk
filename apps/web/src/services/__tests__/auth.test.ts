// PATH: apps/web/src/services/__tests__/auth.test.ts
// WHAT: Validates auth service API calls, errors, and session mapping
// WHY:  Protects login behavior without browser or real backend tests
// RELEVANT: apps/web/src/services/auth.ts,apps/web/src/services/api/client.ts,apps/web/src/services/__tests__/session.test.ts

import assert from 'node:assert/strict';
import test from 'node:test';
import { mockWindowAndFetch } from './test-utils';

test('loginWithMagicLink uses X-Auth-Email header and no email in query/body', async (t) => {
  const { calls, restore } = mockWindowAndFetch(
    () =>
      new Response(JSON.stringify({ message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  t.after(restore);

  const { loginWithMagicLink } = await import('../auth');
  await loginWithMagicLink('mail@mail.com');

  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.url, 'http://localhost:3000/api/v1/auth/login');
  assert.equal(call.url.includes('?email='), false);
  assert.equal(call.init?.method, 'POST');
  assert.equal(call.init?.body, undefined);
  const headers = new Headers((call.init?.headers ?? {}) as HeadersInit);
  assert.equal(headers.get('x-auth-email'), 'mail@mail.com');
  assert.equal(headers.get('content-type'), null);
});

test('loginWithMagicLink rethrows API errors with user-facing message', async (t) => {
  const { restore } = mockWindowAndFetch(
    () =>
      new Response(
        JSON.stringify({ error: { code: 'EMAIL_DELIVERY_FAILED', message: 'Could not send link' } }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' },
        },
      ),
  );
  t.after(restore);
  const { ApiError } = await import('../api/client');
  const { loginWithMagicLink } = await import('../auth');

  await assert.rejects(() => loginWithMagicLink('mail@mail.com'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 502);
    assert.equal(error.code, 'EMAIL_DELIVERY_FAILED');
    assert.equal(error.message, 'Could not send link');
    return true;
  });
});

test('verifyMagicLink maps API session data for UI session state', async (t) => {
  const { calls, restore } = mockWindowAndFetch(
    () =>
      new Response(
        JSON.stringify({
          token: 'session-token',
          user: { id: 'u1', email: 'owner@example.com', role: 'owner', company_id: 'c1' },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
  );
  t.after(restore);
  const { verifyMagicLink } = await import('../auth');

  const session = await verifyMagicLink('magic token');

  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/auth/verify?token=magic%20token');
  assert.deepEqual(session, {
    token: 'session-token',
    user: { id: 'u1', email: 'owner@example.com', role: 'owner', companyId: 'c1' },
  });
});
