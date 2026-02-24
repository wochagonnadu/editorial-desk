// PATH: packages/shared/src/email/index.ts
// WHAT: Barrel export for email contracts
// WHY:  Keeps all email types accessible through shared package API
// RELEVANT: packages/shared/src/index.ts,packages/shared/src/email/provider.ts

export * from './types';
export * from './provider';
