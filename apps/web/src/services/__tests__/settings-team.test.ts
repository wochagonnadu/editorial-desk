// PATH: apps/web/src/services/__tests__/settings-team.test.ts
// WHAT: Verifies settings/team service methods call correct API contracts
// WHY:  Protects save settings and team actions wiring without UI renderer overhead
// RELEVANT: apps/web/src/services/company.ts,apps/web/src/services/team.ts

import assert from 'node:assert/strict';
import test from 'node:test';

const mockWindowAndFetch = () => {
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
    return new Response(JSON.stringify({ data: [], invite_id: 'inv-1', reused: false }), {
      status: 200,
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

test('updateCompanySettings sends PATCH /companies/me with body', async (t) => {
  const { calls, restore } = mockWindowAndFetch();
  t.after(restore);
  const { updateCompanySettings } = await import('../company');

  await updateCompanySettings('token-1', { name: 'Desk', domain: 'medical', language: 'ru' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/companies/me');
  assert.equal(calls[0]?.init?.method, 'PATCH');
  assert.match(String(calls[0]?.init?.body), /"name":"Desk"/);
});

test('team actions hit users/role/invites contracts', async (t) => {
  const { calls, restore } = mockWindowAndFetch();
  t.after(restore);
  const { fetchTeamUsers, updateTeamUserRole, inviteTeamUser } = await import('../team');

  await fetchTeamUsers('token-1');
  await updateTeamUserRole('token-1', 'u-1', 'manager');
  await inviteTeamUser('token-1', { email: 'new@desk.dev', role: 'manager', name: 'New' });

  assert.equal(calls.length, 3);
  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/team/users');
  assert.equal(calls[1]?.url, 'http://localhost:3000/api/v1/team/users/u-1/role');
  assert.equal(calls[1]?.init?.method, 'PATCH');
  assert.equal(calls[2]?.url, 'http://localhost:3000/api/v1/team/invites');
  assert.equal(calls[2]?.init?.method, 'POST');
});
