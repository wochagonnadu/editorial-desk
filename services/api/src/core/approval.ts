// PATH: services/api/src/core/approval.ts
// WHAT: Approval flow orchestration and decision state transitions
// WHY:  Encapsulates approval rules including version safety and reminders
// RELEVANT: services/api/src/routes/drafts.ts,services/api/src/routes/webhooks.ts

import { and, asc, eq, inArray, lt } from 'drizzle-orm';
import { AppError } from './errors';
import type { Database } from '../providers/db';
import {
  approvalDecisionTable,
  approvalFlowTable,
  approvalStepTable,
  draftTable,
} from '../providers/db';

export interface ApprovalConfigStep {
  approver_type: 'user' | 'expert';
  approver_id: string;
}
export interface ApprovalConfig {
  flow_type: 'sequential' | 'parallel';
  deadline_hours: number;
  steps: ApprovalConfigStep[];
}

const withDeadline = (deadlineHours: number) => new Date(Date.now() + deadlineHours * 3600_000);

export const createFlow = async (
  db: Database,
  draftId: string,
  createdBy: string,
  config: ApprovalConfig,
) => {
  const [existing] = await db
    .select()
    .from(approvalFlowTable)
    .where(eq(approvalFlowTable.draftId, draftId))
    .limit(1);
  if (existing) {
    const steps = await db
      .select()
      .from(approvalStepTable)
      .where(eq(approvalStepTable.approvalFlowId, existing.id))
      .orderBy(asc(approvalStepTable.stepOrder));
    return { flow: existing, steps };
  }

  // Keep insert payload explicit; cast avoids TS/Drizzle insert-shape drift across CI environments.
  const [flow] = await db
    .insert(approvalFlowTable)
    .values({
      draftId,
      flowType: config.flow_type,
      status: 'active',
      deadlineHours: config.deadline_hours,
      createdBy,
    } as typeof approvalFlowTable.$inferInsert)
    .returning();

  const steps = await db
    .insert(approvalStepTable)
    .values(
      config.steps.map((step, index) => ({
        approvalFlowId: flow.id,
        stepOrder: index + 1,
        approverType: step.approver_type,
        approverId: step.approver_id,
        status: config.flow_type === 'parallel' || index === 0 ? 'pending' : 'waiting',
        deadlineAt:
          config.flow_type === 'parallel' || index === 0
            ? withDeadline(config.deadline_hours)
            : null,
      })),
    )
    .returning();

  return { flow, steps };
};

export const activateNextStep = async (
  db: Database,
  approvalFlowId: string,
  deadlineHours: number,
) => {
  const [next] = await db
    .select()
    .from(approvalStepTable)
    .where(
      and(
        eq(approvalStepTable.approvalFlowId, approvalFlowId),
        eq(approvalStepTable.status, 'waiting'),
      ),
    )
    .orderBy(asc(approvalStepTable.stepOrder))
    .limit(1);
  if (!next) return null;
  const [updated] = await db
    .update(approvalStepTable)
    .set({
      status: 'pending',
      deadlineAt: withDeadline(deadlineHours),
    } as Partial<typeof approvalStepTable.$inferInsert>)
    .where(eq(approvalStepTable.id, next.id))
    .returning();
  return updated;
};

export const activateAllSteps = async (
  db: Database,
  approvalFlowId: string,
  deadlineHours: number,
) => {
  const deadlineAt = withDeadline(deadlineHours);
  await db
    .update(approvalStepTable)
    .set({
      status: 'pending',
      deadlineAt,
    } as Partial<typeof approvalStepTable.$inferInsert>)
    .where(
      and(
        eq(approvalStepTable.approvalFlowId, approvalFlowId),
        eq(approvalStepTable.status, 'waiting'),
      ),
    );
};

export const recordDecision = async (
  db: Database,
  approvalStepId: string,
  draftVersionId: string,
  decision: 'approved' | 'changes_requested',
  comment?: string,
) => {
  const [step] = await db
    .select()
    .from(approvalStepTable)
    .where(eq(approvalStepTable.id, approvalStepId))
    .limit(1);
  if (!step) throw new AppError(404, 'NOT_FOUND', 'Approval step not found');
  if (step.status !== 'pending') throw new AppError(409, 'CONFLICT', 'Step already processed');

  const [flow] = await db
    .select()
    .from(approvalFlowTable)
    .where(eq(approvalFlowTable.id, step.approvalFlowId))
    .limit(1);
  if (!flow) throw new AppError(404, 'NOT_FOUND', 'Approval flow not found');
  const [draft] = await db
    .select()
    .from(draftTable)
    .where(eq(draftTable.id, flow.draftId))
    .limit(1);
  if (!draft || draft.currentVersionId !== draftVersionId)
    throw new AppError(409, 'STALE_VERSION', 'Referenced version is stale');

  const [saved] = await db
    .insert(approvalDecisionTable)
    .values({
      approvalStepId,
      draftVersionId,
      decision,
      comment: comment ?? null,
    } as typeof approvalDecisionTable.$inferInsert)
    .returning();
  await db
    .update(approvalStepTable)
    .set({ status: decision } as Partial<typeof approvalStepTable.$inferInsert>)
    .where(eq(approvalStepTable.id, step.id));
  return { flow, step, saved };
};

export const consolidateFeedback = async (db: Database, approvalFlowId: string) => {
  const steps = await db
    .select()
    .from(approvalStepTable)
    .where(eq(approvalStepTable.approvalFlowId, approvalFlowId));
  const needsChanges = steps.filter((step) => step.status === 'changes_requested');
  if (needsChanges.length === 0) return [];
  const ids = needsChanges.map((step) => step.id);
  const decisions = await db
    .select()
    .from(approvalDecisionTable)
    .where(inArray(approvalDecisionTable.approvalStepId, ids));
  return decisions.map((item) => item.comment).filter((item): item is string => Boolean(item));
};

export const checkDeadlines = async (db: Database) => {
  const now = new Date();
  return db
    .select()
    .from(approvalStepTable)
    .where(and(eq(approvalStepTable.status, 'pending'), lt(approvalStepTable.deadlineAt, now)));
};
