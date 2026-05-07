// PATH: apps/web/src/services/__tests__/session.test.ts
// WHAT: Validates session storage helpers used by login and logout flows
// WHY:  Covers logout cleanup without browser renderer dependencies
// RELEVANT: apps/web/src/services/session.tsx,apps/web/src/pages/Logout.tsx,apps/web/src/pages/Login.tsx

import assert from 'node:assert/strict';
import test from 'node:test';
import { mockWindowAndFetch } from './test-utils';

test('session storage helpers support logout cleanup and invalid-session reset', async (t) => {
  const { storage, restore } = mockWindowAndFetch(
    () =>
      new Response(JSON.stringify({ message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  t.after(restore);
  const { clearStoredSession, readStoredSession, writeStoredSession } = await import('../session');

  const session = {
    token: 'session-token',
    user: { id: 'u1', email: 'owner@example.com', role: 'owner' as const, companyId: 'c1' },
  };
  writeStoredSession(session);
  assert.deepEqual(readStoredSession(), session);

  clearStoredSession();
  assert.equal(readStoredSession(), null);

  storage.set('editorialdesk.session', '{bad json');
  assert.equal(readStoredSession(), null);
  assert.equal(storage.has('editorialdesk.session'), false);
});
