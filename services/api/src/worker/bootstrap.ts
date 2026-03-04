// PATH: services/api/src/worker/bootstrap.ts
// WHAT: Worker bootstrap factory wiring deps, handlers, registry, and runtime
// WHY:  Reuses one worker setup in API and worker entrypoints
// RELEVANT: services/api/src/worker/handlers.ts,services/api/src/worker/runtime.ts

import type { ContentPort, EmailPort } from '@newsroom/shared';
import type { Database } from '../providers/db/pool.js';
import type { Logger } from '../providers/logger.js';
import { createWorkerHandlers } from './handlers.js';
import { createWorkerRegistry } from './registry.js';
import { createInMemoryWorkerRuntime } from './runtime.js';

export interface WorkerRuntimeDeps {
  db: Database;
  email: EmailPort;
  content: ContentPort;
  logger: Logger;
}

export const createWorkerRuntime = (deps: WorkerRuntimeDeps) => {
  const registry = createWorkerRegistry(createWorkerHandlers(deps));
  return createInMemoryWorkerRuntime({ logger: deps.logger, registry });
};
