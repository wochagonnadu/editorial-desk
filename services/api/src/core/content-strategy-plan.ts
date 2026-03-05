// PATH: services/api/src/core/content-strategy-plan.ts
// WHAT: Generates and normalizes structured 12-week content strategy plan
// WHY:  Converts LLM output into stable copy-ready payload for topics flow
// RELEVANT: services/api/src/routes/topics-strategy-plan.ts,services/api/src/providers/llm/contracts.ts

import type { ContentPort } from '@newsroom/shared';

const SOURCE_TYPES = new Set(['faq', 'myth', 'seasonal', 'service', 'manual']);

const asText = (value: unknown, fallback = ''): string => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const asWeek = (value: unknown): number => {
  const week = Number(value);
  if (!Number.isFinite(week)) return 1;
  return Math.max(1, Math.min(12, Math.trunc(week)));
};

const asStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const text = asText(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
};

const normalizeCopyPayload = (
  raw: unknown,
  fallbackTitle: string,
  fallbackSourceType: 'service' | 'faq',
  expertId: string,
) => {
  const row = (raw ?? {}) as Record<string, unknown>;
  const sourceType = asText(row.source_type, fallbackSourceType).toLowerCase();
  return {
    title: asText(row.title, fallbackTitle).slice(0, 500),
    description: asText(row.description).slice(0, 2000),
    source_type: SOURCE_TYPES.has(sourceType) ? sourceType : fallbackSourceType,
    expert_id: asText(row.expert_id, expertId),
  };
};

const capItemsPerWeek = <T extends { week: number }>(items: T[], maxPerWeek: number): T[] => {
  const byWeek = new Map<number, number>();
  return items.filter((item) => {
    const count = byWeek.get(item.week) ?? 0;
    if (count >= maxPerWeek) return false;
    byWeek.set(item.week, count + 1);
    return true;
  });
};

export const generateStructuredStrategyPlan = async (
  content: ContentPort,
  input: {
    topicSeed: string;
    expertName: string;
    expertId: string;
    audience: string;
    market: string;
    constraints: { tone: string; maxItemsPerWeek: number };
  },
) => {
  try {
    const raw = await content.generateObject<Record<string, unknown>>({
      meta: {
        useCase: 'content.strategy.plan',
        promptId: 'content.strategy.12w',
        promptVersion: '1.0.0',
      },
      promptVars: {
        topic_seed: input.topicSeed,
        expert_name: input.expertName,
        audience: input.audience,
        market: input.market,
        constraints_json: JSON.stringify(input.constraints),
      },
      schema: { type: 'object', properties: { pillars: { type: 'array' } }, required: ['pillars'] },
    });

    const pillars = (Array.isArray(raw.pillars) ? raw.pillars : [])
      .map((item, index) => {
        const row = (item ?? {}) as Record<string, unknown>;
        const clusters = capItemsPerWeek(
          (Array.isArray(row.clusters) ? row.clusters : [])
            .map((cluster, clusterIndex) => {
              const clusterRow = (cluster ?? {}) as Record<string, unknown>;
              const title = asText(clusterRow.title, `Cluster ${clusterIndex + 1}`);
              return {
                item_id: asText(clusterRow.item_id, `c${index + 1}-${clusterIndex + 1}`),
                week: asWeek(clusterRow.week),
                title,
                angle: asText(clusterRow.angle, 'Practical step-by-step guidance'),
                target_keyword: asText(clusterRow.target_keyword),
                interlink_to: asStringList(clusterRow.interlink_to),
                copy_payload: normalizeCopyPayload(
                  clusterRow.copy_payload,
                  title,
                  'service',
                  input.expertId,
                ),
              };
            })
            .filter((cluster) => cluster.copy_payload.title.length >= 3),
          input.constraints.maxItemsPerWeek,
        );
        const faq = capItemsPerWeek(
          (Array.isArray(row.faq) ? row.faq : [])
            .map((faqItem, faqIndex) => {
              const faqRow = (faqItem ?? {}) as Record<string, unknown>;
              const question = asText(faqRow.question, `FAQ ${faqIndex + 1}`);
              return {
                item_id: asText(faqRow.item_id, `f${index + 1}-${faqIndex + 1}`),
                week: asWeek(faqRow.week),
                question,
                short_answer: asText(faqRow.short_answer, 'Short expert answer.'),
                interlink_to: asStringList(faqRow.interlink_to),
                copy_payload: normalizeCopyPayload(
                  faqRow.copy_payload,
                  `FAQ: ${question}`,
                  'faq',
                  input.expertId,
                ),
              };
            })
            .filter((item) => item.copy_payload.title.length >= 3),
          input.constraints.maxItemsPerWeek,
        );
        return {
          pillar_id: asText(row.pillar_id, `p${index + 1}`),
          title: asText(row.title, `Pillar ${index + 1}`),
          goal: asText(row.goal, 'Keep editorial rhythm and practical value.'),
          clusters,
          faq,
        };
      })
      .filter((pillar) => pillar.clusters.length > 0 || pillar.faq.length > 0);

    if (pillars.length === 0) throw new Error('empty structured plan');
    const interlinking = (Array.isArray(raw.interlinking) ? raw.interlinking : [])
      .map((edge) => {
        const row = (edge ?? {}) as Record<string, unknown>;
        return {
          from_item_id: asText(row.from_item_id),
          to_item_id: asText(row.to_item_id),
          anchor_hint: asText(row.anchor_hint),
        };
      })
      .filter((edge) => edge.from_item_id && edge.to_item_id);

    return { horizon_weeks: 12, pillars, interlinking };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM_UPSTREAM_ERROR: ${message}`);
  }
};
