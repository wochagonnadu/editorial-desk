// PATH: services/api/src/routes/topics-strategy-plan.ts
// WHAT: Route handler for structured 12-week strategy plan generation
// WHY:  Exposes practical non-black-box planning output for Create Draft flow
// RELEVANT: services/api/src/routes/topics.ts,services/api/src/core/content-strategy-plan.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { generateStructuredStrategyPlan } from '../core/content-strategy-plan.js';
import { expertTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';

const toIsoNow = (): string => new Date().toISOString();

const parseRequiredString = (value: unknown, field: string, min = 1): string => {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} is required`);
  }
  return value.trim();
};

const parseOptionalString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized || fallback;
};

const parseConstraints = (value: unknown): { tone: string; maxItemsPerWeek: number } => {
  if (
    value !== undefined &&
    (typeof value !== 'object' || value === null || Array.isArray(value))
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'constraints must be an object');
  }
  const row = (value ?? {}) as Record<string, unknown>;
  const tone = parseOptionalString(row.tone, 'practical and calm');
  const maxItemsRaw = row.max_items_per_week;
  const maxItemsPerWeek = maxItemsRaw === undefined ? 2 : Number(maxItemsRaw);
  if (!Number.isInteger(maxItemsPerWeek) || maxItemsPerWeek < 1 || maxItemsPerWeek > 4) {
    throw new AppError(400, 'VALIDATION_ERROR', 'constraints.max_items_per_week must be 1..4');
  }
  return { tone, maxItemsPerWeek };
};

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    if (error.status === 400 && error.code !== 'VALIDATION_ERROR') {
      return new AppError(400, 'VALIDATION_ERROR', error.message, error.details);
    }
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('VALIDATION_ERROR:')) {
    return new AppError(400, 'VALIDATION_ERROR', message.replace('VALIDATION_ERROR:', '').trim());
  }
  if (message.startsWith('LLM_UPSTREAM_ERROR:')) {
    return new AppError(502, 'LLM_UPSTREAM_ERROR', 'Could not generate strategy plan', {
      cause: message.replace('LLM_UPSTREAM_ERROR:', '').trim(),
    });
  }
  return new AppError(502, 'LLM_UPSTREAM_ERROR', 'Could not generate strategy plan');
};

export const createStrategyPlanHandler =
  (deps: RouteDeps) =>
  async (context: Context): Promise<Response> => {
    try {
      const authUser = getAuthUser(context);
      const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
      const expertId = parseRequiredString(body.expert_id, 'expert_id');
      const topicSeed = parseRequiredString(body.topic_seed, 'topic_seed', 3);
      const audience = parseOptionalString(body.audience, 'general');
      const market = parseOptionalString(body.market, 'en-US');
      const constraints = parseConstraints(body.constraints);

      const [expert] = await deps.db
        .select({ id: expertTable.id, name: expertTable.name })
        .from(expertTable)
        .where(and(eq(expertTable.id, expertId), eq(expertTable.companyId, authUser.companyId)))
        .limit(1);
      if (!expert) throw new AppError(404, 'NOT_FOUND', 'Expert not found');

      const plan = await generateStructuredStrategyPlan(deps.content, {
        topicSeed,
        expertName: expert.name,
        expertId: expert.id,
        audience,
        market,
        constraints,
      });
      return context.json({
        plan,
        input_snapshot: {
          expert: {
            id: expert.id,
            name: expert.name,
          },
          topic_seed: topicSeed,
          audience,
          market,
          constraints: {
            tone: constraints.tone,
            max_items_per_week: constraints.maxItemsPerWeek,
          },
          generated_at: toIsoNow(),
        },
      });
    } catch (error) {
      throw toAppError(error);
    }
  };
