// PATH: services/api/src/worker/registry.ts
// WHAT: Minimal registry for worker job handlers
// WHY:  Centralizes job-to-handler mapping and prevents missing handlers at runtime
// RELEVANT: services/api/src/worker/handlers.ts,services/api/src/worker/runtime.ts

import type { WorkerHandlerMap, WorkerJobHandler, WorkerJobName } from './types.js';

export interface WorkerRegistry {
  get<T extends WorkerJobName>(name: T): WorkerJobHandler<T>;
  list(): WorkerJobName[];
}

export const createWorkerRegistry = (handlers: WorkerHandlerMap): WorkerRegistry => {
  return {
    get(name) {
      const handler = handlers[name];
      if (!handler) {
        throw new Error(`worker.handler_missing:${name}`);
      }
      return handler as WorkerJobHandler<typeof name>;
    },
    list() {
      return Object.keys(handlers) as WorkerJobName[];
    },
  };
};
