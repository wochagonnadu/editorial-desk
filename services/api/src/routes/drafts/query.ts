// PATH: services/api/src/routes/drafts/query.ts
// WHAT: Query handlers for draft list, detail, and version history
// WHY:  Supports Kanban and detail pages with consistent payloads
// RELEVANT: services/api/src/routes/drafts.ts,apps/web/src/pages/DraftsPage.tsx

import { and, asc, desc, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { AppError } from '../../core/errors';
import { approvalFlowTable, approvalStepTable, commentTable, draftTable, draftVersionTable, expertTable, factcheckReportTable, topicTable, userTable } from '../../providers/db';
import { getAuthUser } from '../auth-middleware';
import type { RouteDeps } from '../deps';

export const getDraftsList = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const status = context.req.query('status');
  const expertId = context.req.query('expert_id');
  const predicates = [eq(draftTable.companyId, authUser.companyId)];
  if (status) predicates.push(eq(draftTable.status, status));
  if (expertId) predicates.push(eq(draftTable.expertId, expertId));
  const drafts = await deps.db.select().from(draftTable).where(and(...predicates));

  const data = await Promise.all(drafts.map(async (draft) => {
    const [topic] = await deps.db.select().from(topicTable).where(eq(topicTable.id, draft.topicId)).limit(1);
    const [expert] = await deps.db.select().from(expertTable).where(eq(expertTable.id, draft.expertId)).limit(1);
    const [version] = draft.currentVersionId
      ? await deps.db.select().from(draftVersionTable).where(eq(draftVersionTable.id, draft.currentVersionId)).limit(1)
      : [];
    const [report] = version
      ? await deps.db.select().from(factcheckReportTable).where(eq(factcheckReportTable.draftVersionId, version.id)).limit(1)
      : [];
    return {
      id: draft.id,
      topic: topic ? { id: topic.id, title: topic.title } : null,
      expert: expert ? { id: expert.id, name: expert.name } : null,
      status: draft.status,
      current_version: version?.versionNumber ?? null,
      voice_score: version?.voiceScore ? Number(version.voiceScore) : null,
      factcheck_status: report?.status ?? 'pending',
      updated_at: draft.updatedAt,
    };
  }));

  return context.json({ data });
};

export const getDraftDetail = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const [draft] = await deps.db.select().from(draftTable).where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId))).limit(1);
  if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');

  const [topic] = await deps.db.select().from(topicTable).where(eq(topicTable.id, draft.topicId)).limit(1);
  const [expert] = await deps.db.select().from(expertTable).where(eq(expertTable.id, draft.expertId)).limit(1);
  const [currentVersion] = draft.currentVersionId ? await deps.db.select().from(draftVersionTable).where(eq(draftVersionTable.id, draft.currentVersionId)).limit(1) : [];
  const [factcheck] = currentVersion ? await deps.db.select().from(factcheckReportTable).where(eq(factcheckReportTable.draftVersionId, currentVersion.id)).limit(1) : [];
  const comments = currentVersion ? await deps.db.select().from(commentTable).where(eq(commentTable.draftVersionId, currentVersion.id)) : [];
  const [approvalFlow] = await deps.db.select().from(approvalFlowTable).where(eq(approvalFlowTable.draftId, draft.id)).limit(1);

  let approval: Record<string, unknown> | null = null;
  if (approvalFlow) {
    const steps = await deps.db.select().from(approvalStepTable).where(eq(approvalStepTable.approvalFlowId, approvalFlow.id)).orderBy(asc(approvalStepTable.stepOrder));
    approval = {
      flow_type: approvalFlow.flowType,
      status: approvalFlow.status,
      steps: await Promise.all(steps.map(async (step) => {
        const [user] = step.approverType === 'user' ? await deps.db.select().from(userTable).where(eq(userTable.id, step.approverId)).limit(1) : [];
        const [approverExpert] = step.approverType === 'expert' ? await deps.db.select().from(expertTable).where(eq(expertTable.id, step.approverId)).limit(1) : [];
        return {
          step_order: step.stepOrder,
          status: step.status,
          deadline_at: step.deadlineAt,
          approver: { name: user?.name ?? approverExpert?.name ?? 'Unknown', email: user?.email ?? approverExpert?.email ?? null },
        };
      })),
    };
  }

  return context.json({ id: draft.id, status: draft.status, topic, expert, current_version: currentVersion, factcheck_report: factcheck, approval, comments });
};

export const getDraftVersions = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const [draft] = await deps.db.select().from(draftTable).where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId))).limit(1);
  if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');
  const versions = await deps.db.select().from(draftVersionTable).where(eq(draftVersionTable.draftId, draftId)).orderBy(desc(draftVersionTable.versionNumber));
  return context.json({ data: versions });
};
