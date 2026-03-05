// PATH: apps/web/src/services/drafts.ts
// WHAT: Drafts API adapter for list/detail/versions/comments/actions
// WHY:  Keeps draft DTO mapping and payload formats out of page components
// RELEVANT: apps/web/src/pages/Drafts.tsx,apps/web/src/pages/DraftEditor.tsx

import { API_BASE_URL, ApiError, apiRequest } from './api/client';
import { mapDto } from './api/mapper';

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
  content: string;
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
    currentVersion: number | null;
    factcheckStatus: string;
    updatedAt: string;
  }>;
};

type DraftDetailResponse = {
  id: string;
  status: string;
  topic: { title: string } | null;
  expert: { id: string; name: string } | null;
  currentVersion: {
    id: string;
    versionNumber: number;
    content: string;
    summary?: string | null;
  } | null;
  factcheckReport?: {
    status?: string;
    results?: Array<{ claimId?: string; verdict?: string; notes?: string }>;
  } | null;
  comments: Array<{ id: string; text: string; createdAt: string; authorType: string }>;
};

type DraftVersionsResponse = {
  data: Array<{
    id: string;
    versionNumber: number;
    summary?: string | null;
    content?: string | null;
    createdAt: string;
  }>;
};

export const fetchDrafts = async (
  token: string,
  filters?: { expertId?: string; status?: string },
): Promise<DraftListItem[]> => {
  const params = new URLSearchParams();
  if (filters?.expertId) params.set('expert_id', filters.expertId);
  if (filters?.status) params.set('status', filters.status);
  const query = params.size > 0 ? `/api/v1/drafts?${params.toString()}` : '/api/v1/drafts';
  const raw = await apiRequest<unknown>(query, { token });
  const response = mapDto<DraftListResponse>(raw);
  return response.data.map((item) => ({
    id: item.id,
    title: item.topic?.title ?? 'Untitled',
    expertName: item.expert?.name ?? 'Unknown expert',
    status: item.status,
    factcheckStatus: item.factcheckStatus,
    currentVersion: item.currentVersion,
    updatedAt: item.updatedAt,
  }));
};

export const fetchDraftDetail = async (token: string, id: string): Promise<DraftDetail> => {
  const raw = await apiRequest<unknown>(`/api/v1/drafts/${id}`, { token });
  const data = mapDto<DraftDetailResponse>(raw);
  if (!data.currentVersion) {
    throw new Error('Draft has no active version');
  }

  return {
    id: data.id,
    status: data.status,
    topicTitle: data.topic?.title ?? 'Untitled',
    expertName: data.expert?.name ?? 'Unknown expert',
    expertId: data.expert?.id ?? '',
    content: data.currentVersion.content,
    summary: data.currentVersion.summary ?? '',
    currentVersionId: data.currentVersion.id,
    currentVersionNumber: data.currentVersion.versionNumber,
    comments: data.comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      authorType: comment.authorType,
    })),
    hasCompletedFactcheck: data.factcheckReport?.status === 'completed',
    factcheckResults: (data.factcheckReport?.results ?? []).map((item) => ({
      claimId: item.claimId ?? 'unknown',
      verdict: item.verdict ?? 'pending',
      notes: item.notes,
    })),
  };
};

export const fetchDraftVersions = async (token: string, id: string): Promise<DraftVersion[]> => {
  const raw = await apiRequest<unknown>(`/api/v1/drafts/${id}/versions`, {
    token,
  });
  const response = mapDto<DraftVersionsResponse>(raw);
  return response.data.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    summary: version.summary ?? 'No summary',
    content: version.content ?? '',
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

const readSseUntilDone = async (response: Response): Promise<void> => {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const line = chunk
        .split('\n')
        .map((row) => row.trim())
        .find((row) => row.startsWith('data:'));
      if (!line) continue;
      const payload = JSON.parse(line.slice(5).trim()) as { type?: string };
      if (payload.type === 'done') return;
    }
  }
};

const toApiError = async (response: Response, fallbackMessage: string): Promise<ApiError> => {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string; details?: Record<string, unknown> };
  };
  return new ApiError(
    response.status,
    payload.error?.code ?? 'API_ERROR',
    payload.error?.message ?? fallbackMessage,
    payload.error?.details,
  );
};

export const generateDraftContent = async (token: string, id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/drafts/${id}/generate`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw await toApiError(response, 'Draft generation failed');
  }

  await readSseUntilDone(response);
};

export const runDraftFactcheck = async (token: string, id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/drafts/${id}/factcheck`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw await toApiError(response, 'Factcheck failed');
  }

  await readSseUntilDone(response);
};
