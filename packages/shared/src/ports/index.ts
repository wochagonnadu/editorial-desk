// PATH: packages/shared/src/ports/index.ts
// WHAT: Barrel export for shared port interfaces
// WHY:  Defines integration contracts before provider implementations
// RELEVANT: packages/shared/src/index.ts,specs/001-virtual-newsroom-mvp/contracts/webhooks.md,packages/shared/src/ports/email-port.ts

export * from './email-port';
export * from './content-port';
export * from './draft-store';
export * from './expert-store';
