// PATH: services/api/src/providers/db/schema.ts
// WHAT: Barrel export for all Drizzle schema groups
// WHY:  Keeps per-file schema under 100 LOC while exposing full model
// RELEVANT: services/api/drizzle.config.ts,services/api/src/providers/db/pool.ts

export * from './schema/company-user.js';
export * from './schema/expert-voice.js';
export * from './schema/topic-draft.js';
export * from './schema/factcheck.js';
export * from './schema/approval.js';
export * from './schema/comms-audit.js';
