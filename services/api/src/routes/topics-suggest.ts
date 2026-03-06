// PATH: services/api/src/routes/topics-suggest.ts
// WHAT: Route handler for dashboard topic suggestions based on active experts
// WHY:  Exposes existing topics.suggest core logic to web without new LLM scope
// RELEVANT: services/api/src/routes/topics.ts,services/api/src/core/topics.ts

import { and, eq, inArray } from 'drizzle-orm';
import type { Context } from 'hono';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { suggestTopics } from '../core/topics.js';
import { companyTable, expertTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';

const parseExpertIds = (value: unknown): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'expert_ids must be an array of strings');
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
};

export const createTopicsSuggestHandler =
  (deps: RouteDeps) =>
  async (context: Context): Promise<Response> => {
    const authUser = getAuthUser(context);
    const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
    const expertIds = parseExpertIds(body.expert_ids);
    const [company] = await deps.db
      .select({ id: companyTable.id, name: companyTable.name, domain: companyTable.domain })
      .from(companyTable)
      .where(eq(companyTable.id, authUser.companyId))
      .limit(1);
    if (!company) throw new AppError(404, 'NOT_FOUND', 'Company not found');

    const filters = [eq(expertTable.companyId, authUser.companyId), eq(expertTable.status, 'active')];
    if (expertIds.length > 0) filters.push(inArray(expertTable.id, expertIds));
    const experts = await deps.db
      .select({ id: expertTable.id, name: expertTable.name, roleTitle: expertTable.roleTitle, domain: expertTable.domain })
      .from(expertTable)
      .where(and(...filters));
    if (expertIds.length > 0 && experts.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Active experts not found');
    }

    const suggested = await suggestTopics(deps.content, {
      company: { domain: company.domain, name: company.name },
      experts: experts.map((expert) => ({
        id: expert.id,
        name: expert.name,
        role_title: expert.roleTitle,
        domain: expert.domain,
      })),
    });

    return context.json({
      data: suggested.map((item) => {
        const expert = item.expert_id ? experts.find((row) => row.id === item.expert_id) ?? null : null;
        return {
          title: item.title,
          description: item.description,
          source_type: item.source_type,
          expert: expert ? { id: expert.id, name: expert.name } : null,
          save_payload: {
            title: item.title,
            description: item.description,
            source_type: item.source_type,
            expert_id: item.expert_id ?? null,
          },
        };
      }),
    });
  };
