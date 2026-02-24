// PATH: packages/shared/src/ports/index.ts
// WHAT: Barrel export for shared port interfaces
// WHY:  Defines integration contracts before provider implementations
// RELEVANT: packages/shared/src/index.ts,specs/001-virtual-newsroom-mvp/contracts/webhooks.md

export interface PlaceholderPort {
  readonly name: 'placeholder';
}
