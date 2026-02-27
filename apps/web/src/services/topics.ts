// PATH: apps/web/src/services/topics.ts
// WHAT: Topics API adapter for list/create/approve workflow
// WHY:  Keeps CreateDraft page focused on flow, not transport details
// RELEVANT: apps/web/src/pages/CreateDraft.tsx,apps/web/src/services/drafts.ts

import { apiRequest } from './api/client';

export type TopicItem = {
  id: string;
  title: string;
  status: string;
  expertId: string | null;
  expertName: string | null;
};

type TopicsResponse = {
  data: Array<{
    id: string;
    title: string;
    status: string;
    expert: { id: string; name: string } | null;
  }>;
};

export const fetchTopics = async (token: string): Promise<TopicItem[]> => {
  const response = await apiRequest<TopicsResponse>('/api/v1/topics', { token });
  return response.data.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    expertId: item.expert?.id ?? null,
    expertName: item.expert?.name ?? null,
  }));
};

export const createTopic = async (
  token: string,
  payload: { title: string; expertId: string },
): Promise<string> => {
  const response = await apiRequest<{ id: string }>('/api/v1/topics', {
    method: 'POST',
    token,
    body: {
      title: payload.title,
      expert_id: payload.expertId,
      source_type: 'manual',
    },
  });
  return response.id;
};

export const approveTopic = async (token: string, topicId: string): Promise<void> => {
  await apiRequest(`/api/v1/topics/${topicId}/approve`, {
    method: 'POST',
    token,
  });
};
