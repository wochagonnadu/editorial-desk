// PATH: apps/web/src/pages/create-draft/__tests__/strategy-lock.test.ts
// WHAT: Verifies locked strategy snapshot state rules for Create Draft
// WHY:  Covers dirty/reset/regenerate behavior without needing browser test infra
// RELEVANT: apps/web/src/pages/create-draft/strategy-lock.ts,apps/web/src/pages/CreateDraft.tsx

import assert from 'node:assert/strict';
import test from 'node:test';
import { getStrategyMismatchMessage, isStrategyDirty, resetFormToSnapshot } from '../strategy-lock';
import type { StrategyInputSnapshot } from '../../../services/topics';

const snapshot: StrategyInputSnapshot = {
  expert: { id: 'e1', name: 'Dr. Example' },
  topicSeed: 'Implants FAQ',
  audience: 'general',
  market: 'en-US',
  constraints: { tone: 'practical and calm', maxItemsPerWeek: 2 },
  generatedAt: '2026-03-06T12:00:00.000Z',
};

test('generate -> edit inputs without reset keeps locked snapshot explicit', () => {
  const dirty = isStrategyDirty(snapshot, {
    expertId: 'e2',
    topicSeed: 'New topic seed',
  });

  assert.equal(dirty, true);
  assert.match(getStrategyMismatchMessage(dirty) ?? '', /locked strategy context/i);
});

test('generate -> edit inputs -> reset restores locked snapshot inputs', () => {
  const reset = resetFormToSnapshot(snapshot);

  assert.deepEqual(reset, {
    expertId: 'e1',
    topicSeed: 'Implants FAQ',
  });
  assert.equal(isStrategyDirty(snapshot, reset), false);
});

test('matching inputs stay locked without silent mismatch', () => {
  const dirty = isStrategyDirty(snapshot, {
    expertId: 'e1',
    topicSeed: '  Implants FAQ  ',
  });

  assert.equal(dirty, false);
  assert.equal(getStrategyMismatchMessage(dirty), null);
});
