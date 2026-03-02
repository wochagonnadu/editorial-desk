// PATH: services/api/src/routes/dashboard-queries.ts
// WHAT: SQL-запросы для агрегации данных дашборда
// WHY:  Разгружает dashboard.ts, каждая query — отдельная функция
// RELEVANT: services/api/src/routes/dashboard.ts, services/api/src/providers/db/schema.ts

import { and, eq, gte, inArray, sql } from 'drizzle-orm';
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

  const topicIds = [
    ...new Set(rows.map((r) => r.topicId).filter((id): id is string => Boolean(id))),
  ];
  const topics = topicIds.length
    ? await deps.db
        .select({ id: topicTable.id, title: topicTable.title })
        .from(topicTable)
        .where(inArray(topicTable.id, topicIds))
    : [];
  const titleMap = new Map<string, string>();
  for (const topic of topics) titleMap.set(String(topic.id), String(topic.title));

  const now = Date.now();
  return rows
    .map(
      (r): InReviewItem => ({
        draftId: r.draftId,
        title: titleMap.get(String(r.topicId)) ?? 'Untitled',
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

  const topicIds = [
    ...new Set(rows.map((r) => r.topicId).filter((id): id is string => Boolean(id))),
  ];
  const expertIds = [
    ...new Set(rows.map((r) => r.expertId).filter((id): id is string => Boolean(id))),
  ];

  const [topics, experts] = await Promise.all([
    topicIds.length
      ? deps.db
          .select({ id: topicTable.id, title: topicTable.title })
          .from(topicTable)
          .where(inArray(topicTable.id, topicIds))
      : [],
    expertIds.length
      ? deps.db
          .select({ id: expertTable.id, name: expertTable.name })
          .from(expertTable)
          .where(inArray(expertTable.id, expertIds))
      : [],
  ]);
  const titleMap = new Map<string, string>();
  for (const topic of topics) titleMap.set(String(topic.id), String(topic.title));
  const nameMap = new Map<string, string>();
  for (const expert of experts) nameMap.set(String(expert.id), String(expert.name));

  return rows.map(
    (r): WeekScheduleItem => ({
      draftId: r.draftId,
      title: titleMap.get(String(r.topicId)) ?? 'Untitled',
      expertName: nameMap.get(String(r.expertId)) ?? 'Unknown',
      status: r.status as WeekScheduleItem['status'],
      scheduledDate: r.updatedAt.toISOString().slice(0, 10),
    }),
  );
}
