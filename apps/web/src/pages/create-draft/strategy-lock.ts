// PATH: apps/web/src/pages/create-draft/strategy-lock.ts
// WHAT: Pure helpers for locked strategy snapshot state in Create Draft
// WHY:  Keeps UI decisions explicit and easy to verify without browser-only tests
// RELEVANT: apps/web/src/pages/CreateDraft.tsx,apps/web/src/pages/create-draft/StrategyLockSummary.tsx

import type { StrategyInputSnapshot } from '../../services/topics';

export type StrategyFormValues = {
  expertId: string;
  topicSeed: string;
};

export const normalizeTopicSeed = (value: string): string => value.trim();

export const isStrategyDirty = (
  snapshot: StrategyInputSnapshot | null,
  form: StrategyFormValues,
): boolean => {
  if (!snapshot) return false;
  return (
    snapshot.expert.id !== form.expertId ||
    snapshot.topicSeed !== normalizeTopicSeed(form.topicSeed)
  );
};

export const resetFormToSnapshot = (snapshot: StrategyInputSnapshot): StrategyFormValues => ({
  expertId: snapshot.expert.id,
  topicSeed: snapshot.topicSeed,
});

export const getStrategyMismatchMessage = (isDirty: boolean): string | null => {
  if (!isDirty) return null;
  return 'Current form inputs differ from the locked plan. Copy actions still use the locked strategy context until you reset inputs or regenerate the plan.';
};
