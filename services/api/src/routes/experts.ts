// PATH: services/api/src/routes/experts.ts
// WHAT: Expert CRUD and onboarding progress endpoints
// WHY:  Exposes manager-facing controls for voice onboarding lifecycle
// RELEVANT: services/api/src/core/onboarding.ts,apps/web/src/pages/ExpertsPage.tsx

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { ExpertStatus } from '@newsroom/shared';
import { AppError } from '../core/errors.js';
import { startOnboarding } from '../core/onboarding.js';
import { DrizzleExpertStore, onboardingSequenceTable, voiceProfileTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';
import { requestTwoMinutes } from './experts-ping.js';

const parseString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim() === '')
    throw new AppError(400, 'VALIDATION_ERROR', `${field} is required`);
  return value.trim();
};

export const buildExpertRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  const expertStore = new DrizzleExpertStore(deps.db);

  router.post('/', async (context) => {
    const authUser = getAuthUser(context);
    const body = (await context.req.json()) as Record<string, unknown>;
    const created = await expertStore.create({
      companyId: authUser.companyId,
      name: parseString(body.name, 'name'),
      roleTitle: parseString(body.role_title, 'role_title'),
      email: parseString(body.email, 'email').toLowerCase(),
      domain: parseString(body.domain, 'domain') as 'medical' | 'legal' | 'education' | 'business',
      publicTextUrls: Array.isArray(body.public_text_urls) ? body.public_text_urls.map(String) : [],
      status: 'pending',
    });
    await startOnboarding({ db: deps.db, email: deps.email }, created.id);
    return context.json({ id: created.id, status: 'onboarding' }, 201);
  });
  router.get('/', async (context) => {
    const authUser = getAuthUser(context);
    const status = context.req.query('status');
    const experts = await expertStore.list({
      companyId: authUser.companyId,
      status: status as ExpertStatus | undefined,
    });
    const data = await Promise.all(
      experts.map(async (expert) => {
        const steps = await deps.db
          .select()
          .from(onboardingSequenceTable)
          .where(eq(onboardingSequenceTable.expertId, expert.id));
        const [profile] = await deps.db
          .select()
          .from(voiceProfileTable)
          .where(eq(voiceProfileTable.expertId, expert.id))
          .limit(1);
        return {
          ...expert,
          onboarding_progress: steps.filter((step) => step.status === 'replied').length,
          voice_profile_status: profile?.status ?? 'draft',
        };
      }),
    );
    return context.json({ data });
  });
  router.get('/:id', async (context) => {
    const authUser = getAuthUser(context);
    const expert = await expertStore.findById(context.req.param('id'), authUser.companyId);
    if (!expert) throw new AppError(404, 'NOT_FOUND', 'Expert not found');
    const [profile] = await deps.db
      .select()
      .from(voiceProfileTable)
      .where(eq(voiceProfileTable.expertId, expert.id))
      .limit(1);
    return context.json({
      ...expert,
      voice_profile_status: profile?.status ?? 'draft',
      voice_profile_data: profile?.profileData ?? {},
    });
  });

  router.get('/:id/onboarding', async (context) => {
    const authUser = getAuthUser(context);
    const expertId = context.req.param('id');
    const expert = await expertStore.findById(expertId, authUser.companyId);
    if (!expert) throw new AppError(404, 'NOT_FOUND', 'Expert not found');
    const steps = await deps.db
      .select()
      .from(onboardingSequenceTable)
      .where(eq(onboardingSequenceTable.expertId, expertId))
      .orderBy(onboardingSequenceTable.stepNumber);
    return context.json({ expert_id: expertId, steps });
  });

  router.post('/:id/ping', requestTwoMinutes(deps, expertStore));

  return router;
};
