// PATH: services/api/api/worker.ts
// WHAT: Minimal worker runtime bootstrap entrypoint
// WHY:  Separates background job contract from HTTP runtime before full migration
// RELEVANT: services/api/src/worker/runtime.ts,services/api/src/worker/handlers.ts

import { createLogger } from '../src/providers/logger.js';
import { workerHandlers } from '../src/worker/handlers.js';
import { createWorkerRegistry } from '../src/worker/registry.js';
import { DEFAULT_RETRY_POLICY } from '../src/worker/retry-policy.js';
import { createInMemoryWorkerRuntime } from '../src/worker/runtime.js';

const logger = createLogger({ runtime: 'worker' });
const registry = createWorkerRegistry(workerHandlers);

export const workerRuntime = createInMemoryWorkerRuntime({ logger, registry });

logger.info('worker.bootstrap.ready', {
  jobs: registry.list(),
  retry_policy: DEFAULT_RETRY_POLICY,
});

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  logger.info('worker.bootstrap.idle', {
    note: 'Phase B contract ready; migrate real handlers in Phase C',
  });
}
