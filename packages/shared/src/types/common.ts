// PATH: packages/shared/src/types/common.ts
// WHAT: Shared primitive aliases for domain entities
// WHY:  Keeps IDs and timestamps consistent across modules
// RELEVANT: packages/shared/src/types/index.ts,packages/shared/src/ports/draft-store.ts

export type EntityId = string;
export type ISODateTime = string;
