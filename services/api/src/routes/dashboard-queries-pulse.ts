// PATH: services/api/src/routes/dashboard-queries-pulse.ts
// WHAT: Team Pulse и Activity Feed запросы для дашборда
// WHY:  Отделено от dashboard-queries.ts чтобы оба файла ≤100 LOC
// RELEVANT: services/api/src/routes/dashboard.ts, services/api/src/routes/dashboard-queries.ts

import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { ActivityEvent, TeamPulseItem } from '@newsroom/shared';
import { auditLogTable, draftTable, expertTable, voiceProfileTable } from '../providers/db';
import type { RouteDeps } from './deps';

export async function fetchTeamPulse(deps: RouteDeps, companyId: string): Promise<TeamPulseItem[]> {
  const experts = await deps.db
    .select({ id: expertTable.id, name: expertTable.name })
    .from(expertTable)
    .where(eq(expertTable.companyId, companyId));

  if (!experts.length) return [];
  const expertIds = experts.map((e) => e.id);

  // Voice readiness: confirmed=100%, draft=0%, остальное≈50%
  const profiles = await deps.db
    .select({ expertId: voiceProfileTable.expertId, status: voiceProfileTable.status })
    .from(voiceProfileTable)
    .where(sql`${voiceProfileTable.expertId} IN ${expertIds}`);
  const voiceMap = new Map(
    profiles.map((p) => [
      p.expertId,
      p.status === 'confirmed' ? 100 : p.status === 'draft' ? 0 : 50,
    ]),
  );

  // Кол-во черновиков в работе
  const draftCounts = await deps.db
    .select({ expertId: draftTable.expertId, count: count() })
    .from(draftTable)
    .where(
      and(
        eq(draftTable.companyId, companyId),
        sql`${draftTable.status} IN ('drafting', 'factcheck')`,
      ),
    )
    .groupBy(draftTable.expertId);
  const draftCountMap = new Map(draftCounts.map((d) => [d.expertId, Number(d.count)]));

  // Последний ответ эксперта из audit_log
  const lastResponses = await deps.db
    .select({
      actorId: auditLogTable.actorId,
      lastAt: sql<string>`MAX(${auditLogTable.createdAt})`,
    })
    .from(auditLogTable)
    .where(and(eq(auditLogTable.companyId, companyId), eq(auditLogTable.actorType, 'expert')))
    .groupBy(auditLogTable.actorId);
  const responseMap = new Map(lastResponses.map((r) => [r.actorId ?? '', r.lastAt]));

  return experts.map(
    (e): TeamPulseItem => ({
      expertId: e.id,
      name: e.name,
      voiceReadiness: voiceMap.get(e.id) ?? 0,
      lastResponseAt: responseMap.get(e.id) ?? undefined,
      draftsInProgress: draftCountMap.get(e.id) ?? 0,
    }),
  );
}

export async function fetchActivityFeed(
  deps: RouteDeps,
  companyId: string,
): Promise<ActivityEvent[]> {
  const rows = await deps.db
    .select()
    .from(auditLogTable)
    .where(eq(auditLogTable.companyId, companyId))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(20);

  return rows.map(
    (r): ActivityEvent => ({
      id: r.id,
      actor: r.actorType,
      action: r.action,
      target: `${r.entityType}:${r.entityId}`,
      createdAt: r.createdAt.toISOString(),
    }),
  );
}
