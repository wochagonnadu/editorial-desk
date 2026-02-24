// PATH: services/api/src/providers/db/schema.ts
// WHAT: Barrel export for all Drizzle schema groups
// WHY:  Keeps per-file schema under 100 LOC while exposing full model
// RELEVANT: services/api/drizzle.config.ts,services/api/src/providers/db/pool.ts

export * from './schema/company-user';
export * from './schema/expert-voice';
export * from './schema/topic-draft';
export * from './schema/factcheck';
export * from './schema/approval';
export * from './schema/comms-audit';
