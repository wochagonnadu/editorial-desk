// PATH: packages/shared/src/types/topic-draft.ts
// WHAT: Topic planning and draft lifecycle types
// WHY:  Models editorial pipeline state before approval
// RELEVANT: packages/shared/src/types/expert.ts,packages/shared/src/types/factcheck.ts

import type { EntityId, ISODateTime } from './common.js';

export type TopicStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
export type TopicSourceType = 'faq' | 'myth' | 'seasonal' | 'service' | 'manual';
export type DraftStatus = 'drafting' | 'factcheck' | 'needs_review' | 'approved' | 'revisions';

export interface Topic {
  id: EntityId;
  companyId: EntityId;
  expertId?: EntityId;
  title: string;
  description?: string;
  sourceType: TopicSourceType;
  status: TopicStatus;
  createdAt: ISODateTime;
}

export interface Draft {
  id: EntityId;
  topicId: EntityId;
  expertId: EntityId;
  companyId: EntityId;
  currentVersionId?: EntityId;
  status: DraftStatus;
  scheduledPublishAt?: ISODateTime;
  publishTimezone?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DraftVersion {
  id: EntityId;
  draftId: EntityId;
  versionNumber: number;
  content: string;
  summary?: string;
  voiceScore?: number;
  diffFromPrevious?: Record<string, unknown>;
  createdBy: 'system' | 'revision';
  createdAt: ISODateTime;
}
