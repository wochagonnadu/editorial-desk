// PATH: packages/shared/src/ports/email-port.ts
// WHAT: Outbound email port used by core and routes
// WHY:  Isolates delivery mechanics from business workflows
// RELEVANT: packages/shared/src/email/provider.ts,services/api/src/providers/email.ts

export interface ReplyToContext {
  draftId: string;
  version: number;
  expertId: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  textBody?: string;
  replyTo?: string;
  replyToContext?: ReplyToContext;
  metadata?: Record<string, string>;
}

export interface SendMagicLinkInput {
  to: string;
  token: string;
  expiresAt: Date;
  appUrl: string;
}

export interface EmailPort {
  sendEmail(input: SendEmailInput): Promise<{ messageId: string }>;
  sendMagicLink(input: SendMagicLinkInput): Promise<{ messageId: string }>;
  buildReplyToAddress(context: ReplyToContext): string;
}
