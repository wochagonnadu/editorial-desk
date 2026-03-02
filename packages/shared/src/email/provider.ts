// PATH: packages/shared/src/email/provider.ts
// WHAT: Email provider abstraction for outbound and webhook parsing
// WHY:  Enables provider swap without touching business logic
// RELEVANT: packages/shared/src/email/types.ts,services/api/src/providers/email.ts

import type { ClickEvent, DeliveryEvent, InboundEmail, OpenEvent } from './types.js';

export interface EmailProvider {
  sendEmail(params: {
    to: string;
    from: string;
    replyTo: string;
    subject: string;
    html: string;
    textBody?: string;
    metadata?: Record<string, string>;
  }): Promise<{ messageId: string }>;
  parseInbound(raw: unknown): InboundEmail;
  parseDelivery(raw: unknown): DeliveryEvent;
  parseOpen(raw: unknown): OpenEvent;
  parseClick(raw: unknown): ClickEvent;
  verifyWebhookSignature(headers: Headers, body: string): boolean;
}
