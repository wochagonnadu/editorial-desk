// PATH: packages/shared/src/types/index.ts
// WHAT: Barrel export for domain entity types
// WHY:  Keeps type imports centralized and predictable
// RELEVANT: packages/shared/src/index.ts,specs/001-virtual-newsroom-mvp/data-model.md,packages/shared/src/types/common.ts

export * from './common';
export * from './company-user';
export * from './expert';
export * from './topic-draft';
export * from './factcheck';
export * from './approval';
export * from './communication';
export * from './audit';
