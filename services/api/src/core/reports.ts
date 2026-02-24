// PATH: services/api/src/core/reports.ts
// WHAT: Monthly reporting aggregation for owners
// WHY:  Provides ROI visibility over editorial production health
// RELEVANT: services/api/src/routes/reports.ts,services/api/src/routes/cron-digest.ts

import { eq, inArray } from 'drizzle-orm';
import type { Database } from '../providers/db';
import { approvalDecisionTable, approvalFlowTable, approvalStepTable, auditLogTable, draftTable, draftVersionTable, expertTable, topicTable } from '../providers/db';

interface DelayItem {
  expert: string;
  draft_title: string;
  days_delayed: number;
}

const inPeriod = (date: Date, start: Date, end: Date) => date >= start && date < end;
const daysBetween = (from: Date, to: Date) => Math.max(0, (to.getTime() - from.getTime()) / 86_400_000);

export const monthRange = (period: string) => {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('month must be YYYY-MM');
  const [year, month] = period.split('-').map((item) => Number(item));
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
};

export const buildMonthlyReport = async (db: Database, companyId: string, period: string) => {
  const { start, end } = monthRange(period);
  const drafts = await db.select().from(draftTable).where(eq(draftTable.companyId, companyId));
  const periodDrafts = drafts.filter((item) => inPeriod(item.createdAt, start, end));
  const draftIds = periodDrafts.map((item) => item.id);
  if (draftIds.length === 0) {
    return { period, drafts_created: 0, drafts_approved: 0, drafts_pending: 0, avg_approval_days: 0, delays: [] as DelayItem[] };
  }

  const [topics, experts, flows, audits, versions] = await Promise.all([
    db.select().from(topicTable).where(inArray(topicTable.id, periodDrafts.map((item) => item.topicId))),
    db.select().from(expertTable).where(inArray(expertTable.id, periodDrafts.map((item) => item.expertId))),
    db.select().from(approvalFlowTable).where(inArray(approvalFlowTable.draftId, draftIds)),
    db.select().from(auditLogTable).where(eq(auditLogTable.companyId, companyId)),
    db.select().from(draftVersionTable).where(inArray(draftVersionTable.draftId, draftIds)),
  ]);

  const steps = flows.length > 0 ? await db.select().from(approvalStepTable).where(inArray(approvalStepTable.approvalFlowId, flows.map((item) => item.id))) : [];
  const decisions = steps.length > 0 ? await db.select().from(approvalDecisionTable).where(inArray(approvalDecisionTable.approvalStepId, steps.map((item) => item.id))) : [];

  const stepToFlow = new Map(steps.map((item) => [item.id, item.approvalFlowId]));
  const flowToDraft = new Map(flows.map((item) => [item.id, item.draftId]));
  const versionToDraft = new Map(versions.map((item) => [item.id, item.draftId]));
  const topicName = new Map(topics.map((item) => [item.id, item.title]));
  const expertName = new Map(experts.map((item) => [item.id, item.name]));

  const approved = periodDrafts.filter((item) => item.status === 'approved');
  const decisionDateByDraft = new Map<string, Date>();
  for (const decision of decisions) {
    const flowId = stepToFlow.get(decision.approvalStepId);
    const flowDraftId = flowId ? flowToDraft.get(flowId) : undefined;
    const versionDraftId = versionToDraft.get(decision.draftVersionId);
    const draftId = flowDraftId ?? versionDraftId;
    if (!draftId) continue;
    const current = decisionDateByDraft.get(draftId);
    if (!current || decision.createdAt > current) decisionDateByDraft.set(draftId, decision.createdAt);
  }

  const avgApprovalDays = approved.length === 0 ? 0 : Number((approved.reduce((acc, item) => acc + daysBetween(item.createdAt, decisionDateByDraft.get(item.id) ?? item.updatedAt), 0) / approved.length).toFixed(2));
  const escalatedDrafts = new Set(audits.filter((item) => item.action === 'reminder.escalated' && item.entityType === 'draft').map((item) => item.entityId));

  const delays = periodDrafts
    .filter((item) => item.status !== 'approved')
    .map((item) => ({ item, days: Math.floor(daysBetween(item.createdAt, new Date())) }))
    .filter(({ item, days }) => days >= 7 || escalatedDrafts.has(item.id))
    .sort((left, right) => right.days - left.days)
    .slice(0, 10)
    .map(({ item, days }) => ({ expert: expertName.get(item.expertId) ?? 'Unknown', draft_title: topicName.get(item.topicId) ?? 'Untitled draft', days_delayed: days }));

  return { period, drafts_created: periodDrafts.length, drafts_approved: approved.length, drafts_pending: periodDrafts.length - approved.length, avg_approval_days: avgApprovalDays, delays };
};
