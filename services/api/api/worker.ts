// PATH: services/api/api/worker.ts
// WHAT: Minimal worker runtime bootstrap entrypoint
// WHY:  Separates background job contract from HTTP runtime before full migration
// RELEVANT: services/api/src/worker/runtime.ts,services/api/src/worker/handlers.ts

import { createContentPort } from '../src/providers/llm.js';
import { createDbClient } from '../src/providers/db/index.js';
import { createEmailPort } from '../src/providers/email.js';
import { createLogger } from '../src/providers/logger.js';
import { createWorkerRuntime } from '../src/worker/bootstrap.js';
import { DEFAULT_RETRY_POLICY } from '../src/worker/retry-policy.js';

const logger = createLogger({ runtime: 'worker' });
const { db } = createDbClient();
const email = createEmailPort(logger);
const content = createContentPort(logger);

export const workerRuntime = createWorkerRuntime({ db, email, content, logger });

logger.info('worker.bootstrap.ready', {
  jobs: ['approval.overdue.dispatch', 'onboarding.reminder.cycle', 'digest.monthly.send'],
  retry_policy: DEFAULT_RETRY_POLICY,
});

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  logger.info('worker.bootstrap.idle', {
    note: 'Worker runtime ready; cron routes enqueue and execute migrated jobs',
  });
}
