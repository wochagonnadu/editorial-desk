// PATH: packages/shared/src/index.ts
// WHAT: Public entry point for shared domain contracts
// WHY:  Exposes one stable import surface for all packages
// RELEVANT: packages/shared/src/types/index.ts,packages/shared/src/ports/index.ts,packages/shared/src/email/index.ts

export * from './types/index.js';
export * from './ports/index.js';
export * from './email/index.js';
