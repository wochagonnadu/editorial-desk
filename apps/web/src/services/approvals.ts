// PATH: apps/web/src/services/approvals.ts
// WHAT: Approvals API adapter for queue, remind, and forward actions
// WHY:  Keeps approvals pages aligned with backend contract and payloads
// RELEVANT: apps/web/src/pages/Approvals.tsx,services/api/src/routes/approvals.ts

import { apiRequest } from './api/client';

export type ApprovalItem = {
  stepId: string;
  draftId: string;
  draftTitle: string;
  reviewer: string;
  status: string;
  timeWaitingSec: number;
};

type ApprovalsResponse = {
  data: Array<{
    stepId: string;
    draftId: string;
    draftTitle: string;
    reviewer: string;
    status: string;
    timeWaitingSec: number;
  }>;
};

export const fetchApprovals = async (
  token: string,
  view: 'stuck' | 'reviewer',
): Promise<ApprovalItem[]> => {
  const response = await apiRequest<ApprovalsResponse>(`/api/v1/approvals?view=${view}`, { token });
  return response.data;
};

export const sendApprovalReminder = async (token: string, stepId: string): Promise<void> => {
  await apiRequest(`/api/v1/approvals/${stepId}/remind`, { method: 'POST', token });
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
