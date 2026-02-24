// PATH: apps/web/src/services/editorial-api.ts
// WHAT: API helper for topic and draft lifecycle endpoints
// WHY:  Isolates US2 network calls from page components
// RELEVANT: apps/web/src/pages/TopicsPage.tsx,apps/web/src/components/PipelineControls.tsx

import type { DraftCard, DraftDetail, PipelineEvent, TopicItem } from './editorial-types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1';
const authHeaders = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

const request = async <T>(token: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(token), ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(((await response.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? 'Request failed');
  return (await response.json()) as T;
};

const readSse = async (response: Response, onEvent?: (event: PipelineEvent) => void): Promise<PipelineEvent[]> => {
  const events: PipelineEvent[] = [];
  const reader = response.body?.getReader();
  if (!reader) return events;

  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.split('\n').find((item) => item.startsWith('data: '));
      if (!line) continue;
      const event = JSON.parse(line.replace('data: ', '')) as PipelineEvent;
      events.push(event);
      onEvent?.(event);
    }
  }

  return events;
};

export const editorialApi = {
  getTopics(token: string, status?: string): Promise<{ data: TopicItem[] }> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(token, `/topics${query}`);
  },
  createTopic(token: string, payload: { title: string; description?: string; expert_id?: string }): Promise<{ id: string; status: string }> {
    return request(token, '/topics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, source_type: 'manual' }) });
  },
  getDrafts(token: string, status?: string): Promise<{ data: DraftCard[] }> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(token, `/drafts${query}`);
  },
  getDraft(token: string, draftId: string): Promise<DraftDetail> {
    return request(token, `/drafts/${draftId}`);
  },
  getDraftVersions(token: string, draftId: string): Promise<{ data: Array<Record<string, unknown>> }> {
    return request(token, `/drafts/${draftId}/versions`);
  },
  createDraft(token: string, topicId: string): Promise<{ id: string }> {
    return request(token, '/drafts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic_id: topicId }) });
  },
  addComment(token: string, draftId: string, text: string): Promise<Record<string, unknown>> {
    return request(token, `/drafts/${draftId}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
  },
  confirmClaim(token: string, draftId: string, claimId: string): Promise<Record<string, unknown>> {
    return request(token, `/drafts/${draftId}/claims/${claimId}/expert-confirm`, { method: 'POST' });
  },
  async runPipelineStep(token: string, draftId: string, step: 'generate' | 'factcheck' | 'revise', body?: Record<string, unknown>, onEvent?: (event: PipelineEvent) => void): Promise<PipelineEvent[]> {
    const response = await fetch(`${API_BASE}/drafts/${draftId}/${step}`, { method: 'POST', headers: { ...authHeaders(token), 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
    if (!response.ok) throw new Error(((await response.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? 'Pipeline failed');
    return readSse(response, onEvent);
  },
};
