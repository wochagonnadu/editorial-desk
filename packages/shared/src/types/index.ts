// PATH: packages/shared/src/types/index.ts
// WHAT: Barrel export for domain entity types
// WHY:  Keeps type imports centralized and predictable
// RELEVANT: packages/shared/src/index.ts,specs/001-virtual-newsroom-mvp/data-model.md,packages/shared/src/types/common.ts

export * from './common.js';
export * from './company-user.js';
export * from './expert.js';
export * from './topic-draft.js';
export * from './factcheck.js';
export * from './approval.js';
export * from './communication.js';
export * from './audit.js';
export * from './dashboard.js';
