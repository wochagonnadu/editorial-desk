// PATH: packages/shared/src/ports/draft-store.ts
// WHAT: Persistence contract for drafts and draft versions
// WHY:  Keeps draft lifecycle logic detached from database details
// RELEVANT: services/api/src/providers/db/draft-store.ts,packages/shared/src/types/topic-draft.ts

import type { Draft, DraftStatus, DraftVersion, EntityId } from '../types';

export interface CreateDraftInput {
  topicId: EntityId;
  expertId: EntityId;
  companyId: EntityId;
  status?: DraftStatus;
}

export interface DraftFilter {
  companyId: EntityId;
  status?: DraftStatus;
  expertId?: EntityId;
}

export interface CreateDraftVersionInput {
  draftId: EntityId;
  content: string;
  summary?: string;
  voiceScore?: number;
  diffFromPrevious?: Record<string, unknown>;
  createdBy: 'system' | 'revision';
}

export interface DraftStore {
  create(input: CreateDraftInput): Promise<Draft>;
  findById(id: EntityId, companyId: EntityId): Promise<Draft | null>;
  list(filter: DraftFilter): Promise<Draft[]>;
  createVersion(input: CreateDraftVersionInput): Promise<DraftVersion>;
  listVersions(draftId: EntityId): Promise<DraftVersion[]>;
}
