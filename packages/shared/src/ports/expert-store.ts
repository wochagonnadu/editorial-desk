// PATH: packages/shared/src/ports/expert-store.ts
// WHAT: Persistence contract for expert entities
// WHY:  Allows core logic to stay independent from Drizzle specifics
// RELEVANT: services/api/src/providers/db/expert-store.ts,packages/shared/src/types/expert.ts

import type { CompanyDomain, EntityId, Expert, ExpertStatus } from '../types/index.js';

export interface CreateExpertInput {
  companyId: EntityId;
  name: string;
  roleTitle: string;
  email: string;
  domain: CompanyDomain;
  managerUserId?: EntityId;
  publicTextUrls?: string[];
  status?: ExpertStatus;
}

export interface ListExpertsFilter {
  companyId: EntityId;
  status?: ExpertStatus;
}

export interface ExpertStore {
  create(input: CreateExpertInput): Promise<Expert>;
  findById(id: EntityId, companyId: EntityId): Promise<Expert | null>;
  list(filter: ListExpertsFilter): Promise<Expert[]>;
}
