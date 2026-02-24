// PATH: packages/shared/src/types/communication.ts
// WHAT: Comment and notification entities
// WHY:  Supports collaboration and email tracking in workflows
// RELEVANT: packages/shared/src/types/topic-draft.ts,packages/shared/src/email/types.ts

import type { EntityId, ISODateTime } from './common';

export type NotificationStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'replied'
  | 'bounced';

export interface Comment {
  id: EntityId;
  draftVersionId: EntityId;
  authorType: 'user' | 'expert';
  authorId: EntityId;
  text: string;
  createdAt: ISODateTime;
}

export interface Notification {
  id: EntityId;
  companyId: EntityId;
  recipientEmail: string;
  notificationType: string;
  emailToken: string;
  magicLinkToken?: string;
  magicLinkExpiresAt?: ISODateTime;
  magicLinkRevoked: boolean;
  status: NotificationStatus;
  createdAt: ISODateTime;
}
