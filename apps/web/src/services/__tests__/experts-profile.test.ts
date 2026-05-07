// PATH: apps/web/src/services/__tests__/experts-profile.test.ts
// WHAT: Verifies experts service save/read profile contracts
// WHY:  Protects web wiring for stable profile save and reload mapping
// RELEVANT: apps/web/src/services/experts.ts,apps/web/src/pages/ExpertSetup.tsx

import assert from 'node:assert/strict';
import test from 'node:test';

const mockWindowAndFetch = (responses: unknown[]) => {
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
    const payload = responses.shift() ?? {};
    return new Response(JSON.stringify(payload), {
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

test('saveExpertProfile sends PATCH profile payload and maps normalized response', async (t) => {
  const { calls, restore } = mockWindowAndFetch([
    {
      id: 'e1',
      profile: {
        role: 'Dentist',
        tone: { primary: 'calm', secondary: ['plain language'] },
        contacts: { email: 'dr@example.com' },
        tags: ['oral health'],
        sources: ['https://example.com/a'],
        background: 'Private clinic',
      },
      updated_at: '2026-03-05T10:20:30.000Z',
    },
  ]);
  t.after(restore);
  const { saveExpertProfile } = await import('../experts');

  const saved = await saveExpertProfile('token-1', 'e1', {
    role: 'Dentist',
    tone: { primary: 'calm', secondary: ['plain language'] },
    contacts: { email: 'dr@example.com' },
    tags: ['oral health'],
    sources: ['https://example.com/a'],
    background: 'Private clinic',
  });

  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/experts/e1/profile');
  assert.equal(calls[0]?.init?.method, 'PATCH');
  assert.match(String(calls[0]?.init?.body), /"profile"/);
  assert.equal(saved.updatedAt, '2026-03-05T10:20:30.000Z');
  assert.deepEqual(saved.profile, {
    role: 'Dentist',
    tone: { primary: 'calm', secondary: ['plain language'] },
    contacts: { email: 'dr@example.com' },
    tags: ['oral health'],
    sources: ['https://example.com/a'],
    background: 'Private clinic',
  });
});

test('fetchExpertDetail maps normalized profile from API', async (t) => {
  const { restore } = mockWindowAndFetch([
    {
      id: 'e1',
      name: 'Dr',
      role_title: 'Dentist',
      email: 'dr@example.com',
      domain: 'medical',
      status: 'active',
      public_text_urls: [],
      voice_profile_status: 'draft',
      voice_profile_data: {},
      profile: {
        role: 'Dentist',
        tone: { primary: 'calm', secondary: [] },
        contacts: {},
        tags: [],
        sources: ['https://example.com/a'],
        background: '',
      },
    },
    {
      onboarding_status: 'active',
      current_step: 1,
      last_event_at: null,
      stalled_reason: null,
      steps: [],
    },
  ]);
  t.after(restore);
  const { fetchExpertDetail } = await import('../experts');

  const detail = await fetchExpertDetail('token-1', 'e1');
  assert.equal(detail.profile.role, 'Dentist');
  assert.equal(detail.profile.tone.primary, 'calm');
  assert.equal(detail.profile.sources[0], 'https://example.com/a');
});
