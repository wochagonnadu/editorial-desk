// PATH: services/api/src/providers/index.ts
// WHAT: Providers layer placeholder barrel
// WHY:  Reserves adapter entry points for DB, email, and LLM
// RELEVANT: services/api/src/app.ts,specs/001-virtual-newsroom-mvp/plan.md,services/api/src/providers/db/index.ts

export * from './db/index.js';
export * from './email.js';
export * from './llm.js';
export * from './logger.js';
