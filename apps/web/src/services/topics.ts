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

export type StrategyInputSnapshot = {
  expert: {
    id: string;
    name: string;
  };
  topicSeed: string;
  audience: string;
  market: string;
  constraints: {
    tone: string;
    maxItemsPerWeek: number;
  };
  generatedAt: string;
};

export type StrategyPlanResult = {
  plan: StrategyPlan;
  inputSnapshot: StrategyInputSnapshot;
};

export type SuggestedTopicItem = {
  title: string;
  description: string;
  sourceType: string;
  expertId: string | null;
  expertName: string | null;
  savePayload: {
    title: string;
    description: string;
    sourceType: string;
    expertId?: string;
  };
};

type TopicsResponse = {
  data: Array<{
    id: string;
    title: string;
    status: string;
    expert: { id: string; name: string } | null;
  }>;
};

type SuggestedTopicsResponse = {
  data: Array<{
    title: string;
    description: string;
    sourceType: string;
    expert: { id: string; name: string } | null;
    savePayload: {
      title: string;
      description: string;
      sourceType: string;
      expertId?: string | null;
    };
  }>;
};

type StrategyPlanResponse = {
  plan: {
    horizonWeeks: number;
    pillars: Array<{
      pillarId: string;
      title: string;
      goal: string;
      clusters: Array<{
        itemId: string;
        week: number;
        title: string;
        angle: string;
        targetKeyword?: string;
        interlinkTo: string[];
        copyPayload: {
          title: string;
          description: string;
          sourceType: string;
          expertId?: string;
        };
      }>;
      faq: Array<{
        itemId: string;
        week: number;
        question: string;
        shortAnswer: string;
        interlinkTo: string[];
        copyPayload: {
          title: string;
          description: string;
          sourceType: string;
          expertId?: string;
        };
      }>;
    }>;
    interlinking: Array<{
      fromItemId: string;
      toItemId: string;
      anchorHint: string;
    }>;
  };
  inputSnapshot: {
    expert: {
      id: string;
      name: string;
    };
    topicSeed: string;
    audience: string;
    market: string;
    constraints: {
      tone: string;
      maxItemsPerWeek: number;
    };
    generatedAt: string;
  };
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
): Promise<StrategyPlanResult> => {
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
  const response = mapDto<StrategyPlanResponse>(raw);
  return {
    plan: {
      horizon_weeks: response.plan.horizonWeeks,
      pillars: response.plan.pillars.map((pillar) => ({
        pillar_id: pillar.pillarId,
        title: pillar.title,
        goal: pillar.goal,
        clusters: pillar.clusters.map((cluster) => ({
          item_id: cluster.itemId,
          week: cluster.week,
          title: cluster.title,
          angle: cluster.angle,
          target_keyword: cluster.targetKeyword,
          interlink_to: cluster.interlinkTo,
          copy_payload: {
            title: cluster.copyPayload.title,
            description: cluster.copyPayload.description,
            source_type: cluster.copyPayload.sourceType,
            expert_id: cluster.copyPayload.expertId,
          },
        })),
        faq: pillar.faq.map((item) => ({
          item_id: item.itemId,
          week: item.week,
          question: item.question,
          short_answer: item.shortAnswer,
          interlink_to: item.interlinkTo,
          copy_payload: {
            title: item.copyPayload.title,
            description: item.copyPayload.description,
            source_type: item.copyPayload.sourceType,
            expert_id: item.copyPayload.expertId,
          },
        })),
      })),
      interlinking: response.plan.interlinking.map((edge) => ({
        from_item_id: edge.fromItemId,
        to_item_id: edge.toItemId,
        anchor_hint: edge.anchorHint,
      })),
    },
    inputSnapshot: {
      expert: response.inputSnapshot.expert,
      topicSeed: response.inputSnapshot.topicSeed,
      audience: response.inputSnapshot.audience,
      market: response.inputSnapshot.market,
      constraints: {
        tone: response.inputSnapshot.constraints.tone,
        maxItemsPerWeek: response.inputSnapshot.constraints.maxItemsPerWeek,
      },
      generatedAt: response.inputSnapshot.generatedAt,
    },
  };
};

export const suggestTopics = async (
  token: string,
  payload?: { expertIds?: string[] },
): Promise<SuggestedTopicItem[]> => {
  const raw = await apiRequest<unknown>('/api/v1/topics/suggest', {
    method: 'POST',
    token,
    body: { expert_ids: payload?.expertIds ?? [] },
  });
  const response = mapDto<SuggestedTopicsResponse>(raw);
  return response.data.map((item) => ({
    title: item.title,
    description: item.description,
    sourceType: item.sourceType,
    expertId: item.expert?.id ?? null,
    expertName: item.expert?.name ?? null,
    savePayload: {
      title: item.savePayload.title,
      description: item.savePayload.description,
      sourceType: item.savePayload.sourceType,
      expertId: item.savePayload.expertId ?? undefined,
    },
  }));
};

export const approveTopic = async (token: string, topicId: string): Promise<void> => {
  await apiRequest(`/api/v1/topics/${topicId}/approve`, {
    method: 'POST',
    token,
  });
};
