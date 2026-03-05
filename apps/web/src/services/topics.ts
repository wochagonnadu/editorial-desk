// PATH: apps/web/src/services/topics.ts
// WHAT: Topics API adapter for list/create/approve and strategy-plan workflow
// WHY:  Keeps CreateDraft page focused on flow, not transport details
// RELEVANT: apps/web/src/pages/CreateDraft.tsx,apps/web/src/services/drafts.ts

import { apiRequest } from './api/client';
import { mapDto } from './api/mapper';

export type TopicItem = {
  id: string;
  title: string;
  status: string;
  expertId: string | null;
  expertName: string | null;
};

export type StrategyCopyPayload = {
  title: string;
  description: string;
  source_type: string;
  expert_id?: string;
};

export type StrategyCluster = {
  item_id: string;
  week: number;
  title: string;
  angle: string;
  target_keyword?: string;
  interlink_to: string[];
  copy_payload: StrategyCopyPayload;
};

export type StrategyFaq = {
  item_id: string;
  week: number;
  question: string;
  short_answer: string;
  interlink_to: string[];
  copy_payload: StrategyCopyPayload;
};

export type StrategyPillar = {
  pillar_id: string;
  title: string;
  goal: string;
  clusters: StrategyCluster[];
  faq: StrategyFaq[];
};

export type StrategyInterlink = {
  from_item_id: string;
  to_item_id: string;
  anchor_hint: string;
};

export type StrategyPlan = {
  horizon_weeks: number;
  pillars: StrategyPillar[];
  interlinking: StrategyInterlink[];
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
  const raw = await apiRequest<unknown>('/api/v1/topics', { token });
  const response = mapDto<TopicsResponse>(raw);
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
  payload: {
    title: string;
    expertId?: string | null;
    description?: string;
    sourceType?: string;
  },
): Promise<string> => {
  const response = await apiRequest<{ id: string }>('/api/v1/topics', {
    method: 'POST',
    token,
    body: {
      title: payload.title,
      expert_id: payload.expertId ?? null,
      description: payload.description ?? null,
      source_type: payload.sourceType ?? 'manual',
    },
  });
  return response.id;
};

export const generateStrategyPlan = async (
  token: string,
  payload: {
    expertId: string;
    topicSeed: string;
    audience?: string;
    market?: string;
    constraints?: { tone?: string; maxItemsPerWeek?: number };
  },
): Promise<StrategyPlan> => {
  const raw = await apiRequest<unknown>('/api/v1/topics/strategy-plan', {
    method: 'POST',
    token,
    body: {
      expert_id: payload.expertId,
      topic_seed: payload.topicSeed,
      audience: payload.audience,
      market: payload.market,
      constraints:
        payload.constraints === undefined
          ? undefined
          : {
              tone: payload.constraints.tone,
              max_items_per_week: payload.constraints.maxItemsPerWeek,
            },
    },
  });
  return mapDto<StrategyPlan>(raw);
};

export const approveTopic = async (token: string, topicId: string): Promise<void> => {
  await apiRequest(`/api/v1/topics/${topicId}/approve`, {
    method: 'POST',
    token,
  });
};
