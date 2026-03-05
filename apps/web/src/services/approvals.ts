// PATH: apps/web/src/services/approvals.ts
// WHAT: Approvals API adapter for queue, decision, remind, and forward actions
// WHY:  Keeps approvals pages aligned with backend contract and payloads
// RELEVANT: apps/web/src/pages/Approvals.tsx,services/api/src/routes/approvals.ts

import { apiRequest } from './api/client';
import { mapDto } from './api/mapper';

export type ApprovalItem = {
  stepId: string;
  draftId: string;
  currentVersionId: string | null;
  draftTitle: string;
  reviewer: string;
  status: string;
  timeWaitingSec: number;
};

type ApprovalsResponse = {
  data: Array<{
    stepId: string;
    draftId: string;
    currentVersionId: string | null;
    draftTitle: string;
    reviewer: string;
    status: string;
    timeWaitingSec: number;
  }>;
};

type ApprovalDecisionInput = {
  action: 'approve' | 'request_changes';
  expectedCurrentVersionId: string;
  comment?: string;
};

export const fetchApprovals = async (
  token: string,
  view: 'stuck' | 'reviewer',
): Promise<ApprovalItem[]> => {
  const raw = await apiRequest<unknown>(`/api/v1/approvals?view=${view}`, { token });
  const response = mapDto<ApprovalsResponse>(raw);
  return response.data;
};

export const sendApprovalReminder = async (token: string, stepId: string): Promise<void> => {
  await apiRequest(`/api/v1/approvals/${stepId}/remind`, { method: 'POST', token });
};

export const decideApprovalStep = async (
  token: string,
  stepId: string,
  input: ApprovalDecisionInput,
): Promise<void> => {
  await apiRequest(`/api/v1/approvals/${stepId}/decision`, {
    method: 'POST',
    token,
    body: {
      action: input.action,
      expected_current_version_id: input.expectedCurrentVersionId,
      comment: input.comment ?? null,
    },
  });
};

export const forwardApprovalStep = async (
  token: string,
  stepId: string,
  reviewerId: string,
): Promise<void> => {
  await apiRequest(`/api/v1/approvals/${stepId}/forward`, {
    method: 'POST',
    token,
    body: { reviewerId },
  });
};
