// PATH: services/api/src/routes/dashboard-queries.ts
// WHAT: SQL-запросы для агрегации данных дашборда
// WHY:  Разгружает dashboard.ts, каждая query — отдельная функция
// RELEVANT: services/api/src/routes/dashboard.ts, services/api/src/providers/db/schema.ts

import { and, eq, gte, sql } from 'drizzle-orm';
import type { InReviewItem, TodayAction, WeekScheduleItem } from '@newsroom/shared';
import { draftTable, expertTable, topicTable } from '../providers/db';
import type { RouteDeps } from './deps';

export async function fetchTodayActions(
  deps: RouteDeps,
  companyId: string,
): Promise<TodayAction[]> {
  // Черновики, ожидающие внимания: needs_review + factcheck
  const drafts = await deps.db
    .select({ id: draftTable.id, status: draftTable.status })
    .from(draftTable)
    .where(
      and(
        eq(draftTable.companyId, companyId),
        sql`${draftTable.status} IN ('needs_review', 'factcheck')`,
      ),
    );

  return drafts.map(
    (d): TodayAction => ({
      id: d.id,
      type: d.status === 'needs_review' ? 'draft_ready' : 'facts_to_confirm',
      label: d.status === 'needs_review' ? 'Draft ready for review' : 'Facts to confirm',
      targetId: d.id,
      targetType: 'draft',
    }),
  );
}

export async function fetchInReview(deps: RouteDeps, companyId: string): Promise<InReviewItem[]> {
  // Драфты в Needs Review, сортировка по времени в статусе (дольше = выше)
  const rows = await deps.db
    .select({
      draftId: draftTable.id,
      topicId: draftTable.topicId,
      updatedAt: draftTable.updatedAt,
    })
    .from(draftTable)
    .where(and(eq(draftTable.companyId, companyId), eq(draftTable.status, 'needs_review')));

  const topicIds = rows.map((r) => r.topicId);
  const topics = topicIds.length
    ? await deps.db
        .select({ id: topicTable.id, title: topicTable.title })
        .from(topicTable)
        .where(sql`${topicTable.id} IN ${topicIds}`)
    : [];
  const titleMap = new Map(topics.map((t) => [t.id, t.title]));

  const now = Date.now();
  return rows
    .map(
      (r): InReviewItem => ({
        draftId: r.draftId,
        title: titleMap.get(r.topicId) ?? 'Untitled',
        status: 'needs_review',
        reviewer: '', // TODO: заполнить из approval_step
        timeInStatusSec: Math.floor((now - r.updatedAt.getTime()) / 1000),
      }),
    )
    .sort((a, b) => b.timeInStatusSec - a.timeInStatusSec);
}

export async function fetchWeekSchedule(
  deps: RouteDeps,
  companyId: string,
): Promise<WeekScheduleItem[]> {
  // TODO: draft не имеет scheduledDate — updatedAt текущей недели как workaround
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const rows = await deps.db
    .select({
      draftId: draftTable.id,
      topicId: draftTable.topicId,
      expertId: draftTable.expertId,
      status: draftTable.status,
      updatedAt: draftTable.updatedAt,
    })
    .from(draftTable)
    .where(and(eq(draftTable.companyId, companyId), gte(draftTable.updatedAt, weekAgo)));

  const topicIds = rows.map((r) => r.topicId);
  const expertIds = [...new Set(rows.map((r) => r.expertId))];

  const [topics, experts] = await Promise.all([
    topicIds.length
      ? deps.db
          .select({ id: topicTable.id, title: topicTable.title })
          .from(topicTable)
          .where(sql`${topicTable.id} IN ${topicIds}`)
      : [],
    expertIds.length
      ? deps.db
          .select({ id: expertTable.id, name: expertTable.name })
          .from(expertTable)
          .where(sql`${expertTable.id} IN ${expertIds}`)
      : [],
  ]);
  const titleMap = new Map(topics.map((t) => [t.id, t.title]));
  const nameMap = new Map(experts.map((e) => [e.id, e.name]));

  return rows.map(
    (r): WeekScheduleItem => ({
      draftId: r.draftId,
      title: titleMap.get(r.topicId) ?? 'Untitled',
      expertName: nameMap.get(r.expertId) ?? 'Unknown',
      status: r.status as WeekScheduleItem['status'],
      scheduledDate: r.updatedAt.toISOString().slice(0, 10),
    }),
  );
}
