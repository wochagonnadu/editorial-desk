// PATH: packages/shared/src/email/types.ts
// WHAT: Provider-agnostic inbound and event email types
// WHY:  Keeps webhook parsing contract stable across providers
// RELEVANT: packages/shared/src/email/provider.ts,specs/001-virtual-newsroom-mvp/contracts/webhooks.md

export interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  textBody: string;
  rawBody: string;
  providerMessageId: string;
  receivedAt: Date;
}

export interface DeliveryEvent {
  providerMessageId: string;
  recipient: string;
  deliveredAt: Date;
}

export interface OpenEvent {
  providerMessageId: string;
  firstOpen: boolean;
  openedAt: Date;
}

export interface ClickEvent {
  providerMessageId: string;
  url: string;
  clickedAt: Date;
}
