// PATH: packages/shared/src/types/company-user.ts
// WHAT: Company and user domain types
// WHY:  Defines tenant and operator structures for the platform
// RELEVANT: packages/shared/src/types/common.ts,packages/shared/src/ports/expert-store.ts

import type { EntityId, ISODateTime } from './common.js';

export type CompanyDomain = 'medical' | 'legal' | 'education' | 'business';
export type UserRole = 'owner' | 'manager';

export interface Company {
  id: EntityId;
  name: string;
  domain: CompanyDomain;
  language: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface User {
  id: EntityId;
  companyId: EntityId;
  email: string;
  name: string;
  role: UserRole;
  createdAt: ISODateTime;
}
