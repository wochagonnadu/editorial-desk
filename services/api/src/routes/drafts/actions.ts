// PATH: services/api/src/routes/drafts/actions.ts
// WHAT: Mutation handlers for comments and expert claim confirmation
// WHY:  Enables revision instructions and high-risk claim confirmation
// RELEVANT: services/api/src/routes/drafts.ts,services/api/src/core/audit.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { AppError } from '../../core/errors.js';
import { logAudit } from '../../core/audit.js';
import { claimTable, commentTable, draftTable, factcheckReportTable } from '../../providers/db/index.js';
import { getAuthUser } from '../auth-middleware.js';
import type { RouteDeps } from '../deps.js';

export const createDraftComment = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const body = (await context.req.json()) as Record<string, unknown>;
  if (typeof body.text !== 'string' || body.text.trim().length < 2)
    throw new AppError(400, 'VALIDATION_ERROR', 'comment text is required');

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft || !draft.currentVersionId)
    throw new AppError(404, 'NOT_FOUND', 'Draft version not found');

  const [comment] = await deps.db
    .insert(commentTable)
    .values({
      draftVersionId: draft.currentVersionId,
      authorType: 'user',
      authorId: authUser.userId,
      text: body.text.trim(),
      positionStart: typeof body.position_start === 'number' ? body.position_start : null,
      positionEnd: typeof body.position_end === 'number' ? body.position_end : null,
    } as unknown as typeof commentTable.$inferInsert)
    .returning();

  return context.json(comment, 201);
};

export const confirmClaim = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const claimId = context.req.param('claim_id');

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft || !draft.currentVersionId) throw new AppError(404, 'NOT_FOUND', 'Draft not found');

  const [claim] = await deps.db
    .select()
    .from(claimTable)
    .where(eq(claimTable.id, claimId))
    .limit(1);
  if (!claim || claim.draftVersionId !== draft.currentVersionId)
    throw new AppError(404, 'NOT_FOUND', 'Claim not found');

  const [report] = await deps.db
    .select()
    .from(factcheckReportTable)
    .where(eq(factcheckReportTable.draftVersionId, draft.currentVersionId))
    .limit(1);
  if (!report) throw new AppError(404, 'NOT_FOUND', 'Factcheck report not found');

  const results = ((report.results as Array<Record<string, unknown>> | null) ?? []).map((item) => {
    if (item.claim_id === claimId || item.claimId === claimId)
      return { ...item, verdict: 'expert_confirmed' };
    return item;
  });
  await deps.db
    .update(factcheckReportTable)
    .set({ results } as Partial<typeof factcheckReportTable.$inferInsert>)
    .where(eq(factcheckReportTable.id, report.id));

  await logAudit(deps.db, {
    companyId: authUser.companyId,
    actorType: 'user',
    actorId: authUser.userId,
    action: 'claim.expert_confirmed',
    entityType: 'claim',
    entityId: claimId,
    draftVersionId: draft.currentVersionId,
    metadata: { draft_id: draftId },
  });

  return context.json({ claim_id: claimId, status: 'expert_confirmed' });
};
