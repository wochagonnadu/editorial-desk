// PATH: apps/web/src/services/__tests__/onboarding.test.ts
// WHAT: Service tests for manager onboarding API adapter behavior
// WHY:  Protects first-run UI state from incomplete onboarding API responses
// RELEVANT: apps/web/src/services/onboarding.ts,apps/web/src/pages/ManagerOnboarding.tsx

import assert from 'node:assert/strict';
import test from 'node:test';
import { mockWindowAndFetch } from './test-utils';

test('updateOnboardingState sends step progress and maps API state', async (t) => {
  const { calls, restore } = mockWindowAndFetch(
    () =>
      new Response(
        JSON.stringify({
          status: 'in_progress',
          current_step: 'team_setup',
          started_at: '2026-05-07T10:00:00.000Z',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
  );
  t.after(restore);
  const { updateOnboardingState } = await import('../onboarding');

  const state = await updateOnboardingState('token-1', {
    status: 'in_progress',
    current_step: 'team_setup',
  });

  assert.equal(calls[0]?.url, 'http://localhost:3000/api/v1/users/me/onboarding');
  assert.equal(calls[0]?.init?.method, 'PATCH');
  assert.equal(calls[0]?.init?.body, '{"status":"in_progress","current_step":"team_setup"}');
  assert.deepEqual(state, {
    status: 'in_progress',
    currentStep: 'team_setup',
    startedAt: '2026-05-07T10:00:00.000Z',
  });
});

test('fetchOnboardingState rejects incomplete onboarding data', async (t) => {
  const { restore } = mockWindowAndFetch(
    () =>
      new Response(JSON.stringify({ status: 'in_progress' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  t.after(restore);
  const { fetchOnboardingState } = await import('../onboarding');

  await assert.rejects(() => fetchOnboardingState('token-1'), /Invalid onboarding step/);
});

test('fetchOnboardingState rejects unknown onboarding status', async (t) => {
  const { restore } = mockWindowAndFetch(
    () =>
      new Response(JSON.stringify({ status: 'done', current_step: 'welcome' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  t.after(restore);
  const { fetchOnboardingState } = await import('../onboarding');

  await assert.rejects(() => fetchOnboardingState('token-1'), /Invalid onboarding status/);
});

test('updateOnboardingState uses final API response as completion source of truth', async (t) => {
  let resolveResponse: ((response: Response) => void) | undefined;
  const { restore } = mockWindowAndFetch(
    () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
  );
  t.after(restore);
  const { updateOnboardingState } = await import('../onboarding');

  let settled = false;
  const result = updateOnboardingState('token-1', { status: 'completed' }).then((state) => {
    settled = true;
    return state;
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(settled, false);

  resolveResponse?.(
    new Response(JSON.stringify({ status: 'in_progress', current_step: 'experts_and_first_workflow' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );

  assert.deepEqual(await result, {
    status: 'in_progress',
    currentStep: 'experts_and_first_workflow',
  });
});
