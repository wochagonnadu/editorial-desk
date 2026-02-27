// PATH: apps/web/src/services/drafts.ts
// WHAT: Drafts API adapter for list/detail/versions/comments/actions
// WHY:  Keeps draft DTO mapping and payload formats out of page components
// RELEVANT: apps/web/src/pages/Drafts.tsx,apps/web/src/pages/DraftEditor.tsx

import { apiRequest } from './api/client';

export type DraftListItem = {
  id: string;
  title: string;
  expertName: string;
  status: string;
  factcheckStatus: string;
  currentVersion: number | null;
  updatedAt: string;
};

export type DraftVersion = {
  id: string;
  versionNumber: number;
  summary: string;
  createdAt: string;
};

export type DraftComment = {
  id: string;
  text: string;
  createdAt: string;
  authorType: string;
};

export type DraftDetail = {
  id: string;
  status: string;
  topicTitle: string;
  expertName: string;
  expertId: string;
  content: string;
  summary: string;
  currentVersionId: string;
  currentVersionNumber: number;
  comments: DraftComment[];
  hasCompletedFactcheck: boolean;
  factcheckResults: Array<{ claimId: string; verdict: string; notes?: string }>;
};

type DraftListResponse = {
  data: Array<{
    id: string;
    topic: { id: string; title: string } | null;
    expert: { id: string; name: string } | null;
    status: string;
    current_version: number | null;
    factcheck_status: string;
    updated_at: string;
  }>;
};

type DraftDetailResponse = {
  id: string;
  status: string;
  topic: { title: string } | null;
  expert: { id: string; name: string } | null;
  current_version: {
    id: string;
    versionNumber: number;
    content: string;
    summary?: string | null;
  } | null;
  factcheck_report?: {
    status?: string;
    results?: Array<{ claim_id?: string; claimId?: string; verdict?: string; notes?: string }>;
  } | null;
  comments: Array<{ id: string; text: string; createdAt: string; authorType: string }>;
};

type DraftVersionsResponse = {
  data: Array<{ id: string; versionNumber: number; summary?: string | null; createdAt: string }>;
};

export const fetchDrafts = async (
  token: string,
  filters?: { expertId?: string; status?: string },
): Promise<DraftListItem[]> => {
  const params = new URLSearchParams();
  if (filters?.expertId) params.set('expert_id', filters.expertId);
  if (filters?.status) params.set('status', filters.status);
  const query = params.size > 0 ? `/api/v1/drafts?${params.toString()}` : '/api/v1/drafts';
  const response = await apiRequest<DraftListResponse>(query, { token });
  return response.data.map((item) => ({
    id: item.id,
    title: item.topic?.title ?? 'Untitled',
    expertName: item.expert?.name ?? 'Unknown expert',
    status: item.status,
    factcheckStatus: item.factcheck_status,
    currentVersion: item.current_version,
    updatedAt: item.updated_at,
  }));
};

export const fetchDraftDetail = async (token: string, id: string): Promise<DraftDetail> => {
  const data = await apiRequest<DraftDetailResponse>(`/api/v1/drafts/${id}`, { token });
  if (!data.current_version) {
    throw new Error('Draft has no active version');
  }

  return {
    id: data.id,
    status: data.status,
    topicTitle: data.topic?.title ?? 'Untitled',
    expertName: data.expert?.name ?? 'Unknown expert',
    expertId: data.expert?.id ?? '',
    content: data.current_version.content,
    summary: data.current_version.summary ?? '',
    currentVersionId: data.current_version.id,
    currentVersionNumber: data.current_version.versionNumber,
    comments: data.comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      authorType: comment.authorType,
    })),
    hasCompletedFactcheck: data.factcheck_report?.status === 'completed',
    factcheckResults: (data.factcheck_report?.results ?? []).map((item) => ({
      claimId: item.claim_id ?? item.claimId ?? 'unknown',
      verdict: item.verdict ?? 'pending',
      notes: item.notes,
    })),
  };
};

export const fetchDraftVersions = async (token: string, id: string): Promise<DraftVersion[]> => {
  const response = await apiRequest<DraftVersionsResponse>(`/api/v1/drafts/${id}/versions`, {
    token,
  });
  return response.data.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    summary: version.summary ?? 'No summary',
    createdAt: version.createdAt,
  }));
};

export const saveDraftVersion = async (
  token: string,
  id: string,
  payload: { content: string; summary: string; expectedCurrentVersionId: string },
): Promise<void> => {
  await apiRequest(`/api/v1/drafts/${id}/versions`, {
    method: 'POST',
    token,
    body: {
      content: payload.content,
      summary: payload.summary,
      expected_current_version_id: payload.expectedCurrentVersionId,
    },
  });
};

export const createDraftComment = async (
  token: string,
  id: string,
  text: string,
): Promise<void> => {
  await apiRequest(`/api/v1/drafts/${id}/comments`, {
    method: 'POST',
    token,
    body: { text },
  });
};

export const sendDraftForReview = async (
  token: string,
  id: string,
  expertId: string,
): Promise<void> => {
  await apiRequest(`/api/v1/drafts/${id}/send-for-review`, {
    method: 'POST',
    token,
    body: {
      flow_type: 'sequential',
      deadline_hours: 48,
      steps: [{ approver_type: 'expert', approver_id: expertId }],
    },
  });
};

export const confirmDraftClaim = async (
  token: string,
  id: string,
  claimId: string,
): Promise<void> => {
  await apiRequest(`/api/v1/drafts/${id}/claims/${claimId}/expert-confirm`, {
    method: 'POST',
    token,
  });
};

export const createDraftFromTopic = async (token: string, topicId: string): Promise<string> => {
  const response = await apiRequest<{ id: string }>('/api/v1/drafts', {
    method: 'POST',
    token,
    body: { topic_id: topicId },
  });
  return response.id;
};
