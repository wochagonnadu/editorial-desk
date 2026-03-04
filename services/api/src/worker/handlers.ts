// PATH: services/api/src/worker/handlers.ts
// WHAT: Phase-B worker handlers registry with safe placeholders
// WHY:  Lets runtime bootstrap now while real side effects move in Phase C
// RELEVANT: services/api/src/worker/registry.ts,services/api/src/worker/types.ts

import type { WorkerHandlerMap, WorkerJobName } from './types.js';

const notMigrated = (name: WorkerJobName) => {
  return async () => ({
    status: 'ignored' as const,
    reason: `phase_c_migration_pending:${name}`,
  });
};

export const workerHandlers: WorkerHandlerMap = {
  'approval.overdue.dispatch': notMigrated('approval.overdue.dispatch'),
  'onboarding.reminder.cycle': notMigrated('onboarding.reminder.cycle'),
  'digest.monthly.send': notMigrated('digest.monthly.send'),
};
