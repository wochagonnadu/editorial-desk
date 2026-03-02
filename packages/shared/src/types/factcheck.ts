// PATH: packages/shared/src/types/factcheck.ts
// WHAT: Factchecking and claims verification types
// WHY:  Defines risk tracking structures for compliance workflows
// RELEVANT: packages/shared/src/types/topic-draft.ts,packages/shared/src/types/approval.ts

import type { EntityId, ISODateTime } from './common.js';

export type ClaimRiskLevel = 'low' | 'medium' | 'high';
export type ClaimType = 'statistic' | 'medical' | 'legal' | 'factual' | 'opinion';
export type FactcheckStatus = 'pending' | 'completed' | 'failed';

export interface Claim {
  id: EntityId;
  draftVersionId: EntityId;
  text: string;
  claimType: ClaimType;
  riskLevel: ClaimRiskLevel;
  createdAt: ISODateTime;
}

export interface FactcheckResult {
  claimId: EntityId;
  verdict: 'confirmed' | 'disputed' | 'needs_expert_review' | 'expert_confirmed';
  evidence: Array<{ source: string; snippet: string }>;
  notes?: string;
}

export interface FactcheckReport {
  id: EntityId;
  draftVersionId: EntityId;
  status: FactcheckStatus;
  results: FactcheckResult[];
  overallRiskScore?: number;
  disclaimerType?: 'medical' | 'legal' | 'financial' | 'none';
  createdAt: ISODateTime;
}
