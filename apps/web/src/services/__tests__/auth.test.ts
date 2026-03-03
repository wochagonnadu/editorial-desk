// PATH: apps/web/src/services/__tests__/auth.test.ts
// WHAT: Validates login service sends X-Auth-Email header without URL/body email
// WHY:  Prevents body-parse instability and keeps email out of query string
// RELEVANT: apps/web/src/services/auth.ts,apps/web/src/services/api/client.ts,specs/007-vercel-auth-json-body-recovery/tasks.md

import assert from 'node:assert/strict';
import test from 'node:test';

test('loginWithMagicLink uses X-Auth-Email header and no email in query/body', async (t) => {
  const originalFetch = globalThis.fetch;
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const originalWindow = (globalThis as { window?: unknown }).window;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: {
        hostname: 'localhost',
        port: '5173',
        origin: 'http://localhost:5173',
      },
    },
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ message: 'ok' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (hadWindow) {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });

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
