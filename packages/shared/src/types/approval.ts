// PATH: packages/shared/src/types/approval.ts
// WHAT: Draft approval flow and decision types
// WHY:  Represents sequential and parallel review workflows
// RELEVANT: packages/shared/src/types/topic-draft.ts,packages/shared/src/types/communication.ts

import type { EntityId, ISODateTime } from './common.js';

export type ApprovalFlowType = 'sequential' | 'parallel';
export type ApprovalFlowStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type ApprovalStepStatus = 'waiting' | 'pending' | 'approved' | 'changes_requested';
export type ApprovalDecisionType = 'approved' | 'changes_requested';

export interface ApprovalFlow {
  id: EntityId;
  draftId: EntityId;
  flowType: ApprovalFlowType;
  status: ApprovalFlowStatus;
  deadlineHours: number;
  createdBy: EntityId;
  createdAt: ISODateTime;
}

export interface ApprovalStep {
  id: EntityId;
  approvalFlowId: EntityId;
  stepOrder: number;
  approverType: 'user' | 'expert';
  approverId: EntityId;
  status: ApprovalStepStatus;
  deadlineAt?: ISODateTime;
  createdAt: ISODateTime;
}

export interface ApprovalDecision {
  id: EntityId;
  approvalStepId: EntityId;
  draftVersionId: EntityId;
  decision: ApprovalDecisionType;
  comment?: string;
  createdAt: ISODateTime;
}
