// PATH: services/api/src/routes/company-generation-preview.ts
// WHAT: Builds generation preview response using workspace policy and LLM prompts
// WHY:  Lets Settings preview editorial policy impact without creating drafts
// RELEVANT: services/api/src/routes/companies.ts,services/api/src/routes/generation-policy.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { companyTable, expertTable, voiceProfileTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';
import { normalizeGenerationPolicy } from './generation-policy.js';

const companyEditorialContext = (description: string) => {
  const value = description.trim();
  return value || 'No company editorial context provided.';
};

const parseField = (value: unknown, field: string, min: number, max: number): string => {
  if (typeof value !== 'string')
    throw new AppError(400, 'VALIDATION_ERROR', `${field} is required`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} must be ${min}..${max} chars`);
  }
  return normalized;
};

export const previewCompanyGeneration = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
  const expertId = parseField(body.expert_id, 'expert_id', 3, 80);
  const topicTitle = parseField(body.topic_title, 'topic_title', 5, 500);
  const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';

  const [company] = await deps.db
    .select()
    .from(companyTable)
    .where(eq(companyTable.id, authUser.companyId))
    .limit(1);
  const [expert] = await deps.db
    .select()
    .from(expertTable)
    .where(and(eq(expertTable.id, expertId), eq(expertTable.companyId, authUser.companyId)))
    .limit(1);
  const [voiceProfile] = await deps.db
    .select()
    .from(voiceProfileTable)
    .where(eq(voiceProfileTable.expertId, expertId))
    .limit(1);

  if (!company) throw new AppError(404, 'NOT_FOUND', 'Company not found');
  if (!expert) throw new AppError(404, 'NOT_FOUND', 'Expert not found');
  if (!voiceProfile) throw new AppError(422, 'VOICE_PROFILE_REQUIRED', 'Voice profile is required');

  const workspacePolicy = normalizeGenerationPolicy(company.generationPolicy);
  const profileData = (voiceProfile.profileData as Record<string, unknown>) ?? {};
  const reviseMode = instructions.length > 0;
  const promptId = reviseMode ? 'drafts.revise.base' : 'drafts.generate.base';
  const useCase = reviseMode ? 'draft.revise' : 'draft.generate';
  const promptVars = reviseMode
    ? {
        instructions,
        draft_content: `# ${topicTitle}\n\nЧерновой фрагмент для предпросмотра тональности.`,
        company_editorial_context: companyEditorialContext(company.description),
        voice_profile_json: JSON.stringify(profileData),
        workspace_generation_policy_json: JSON.stringify(workspacePolicy),
      }
    : {
        topic_title: topicTitle,
        expert_name: expert.name,
        company_editorial_context: companyEditorialContext(company.description),
        voice_profile_json: JSON.stringify(profileData),
        audience: workspacePolicy.default_audience,
        workspace_generation_policy_json: JSON.stringify(workspacePolicy),
      };

  const chunks: string[] = [];
  for await (const chunk of await deps.content.streamText({
    meta: {
      useCase,
      promptId,
      promptVersion: '1.0.0',
      companyId: authUser.companyId,
      expertId: expert.id,
    },
    promptVars,
    voiceProfile: {
      status: voiceProfile.status === 'confirmed' ? 'confirmed' : 'draft',
      confidence: Number(profileData.confidence ?? 0),
      version: String(profileData.profile_version ?? '1.0.0'),
    },
  })) {
    chunks.push(chunk);
  }

  return context.json({
    sample_markdown: chunks.join('').trim() || `# ${topicTitle}`,
    applied_policy: workspacePolicy,
    meta: { use_case: useCase, prompt_id: promptId, prompt_version: '1.0.0' },
  });
};
