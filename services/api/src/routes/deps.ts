// PATH: services/api/src/routes/deps.ts
// WHAT: Shared dependency contract for HTTP route builders
// WHY:  Keeps poor-man DI explicit and testable across route modules
// RELEVANT: services/api/src/routes/index.ts,services/api/src/providers/db/pool.ts

import type { ContentPort, EmailPort } from '@newsroom/shared';
import type { Database } from '../providers/db/pool.js';
import type { Logger } from '../providers/logger.js';
import type { WorkerRuntime } from '../worker/runtime.js';

export interface RouteDeps {
  db: Database;
  email: EmailPort;
  content: ContentPort;
  logger: Logger;
  worker?: WorkerRuntime;
}
