// PATH: services/api/src/core/audit.ts
// WHAT: Audit logging helper for append-only action records
// WHY:  Centralizes write format for compliance traceability
// RELEVANT: services/api/src/providers/db/schema/comms-audit.ts,services/api/src/routes/auth.ts

import type { EntityId } from '@newsroom/shared';
import { auditLogTable } from '../providers/db/schema';
import type { Database } from '../providers/db/pool';

export interface AuditInput {
  companyId: EntityId;
  actorType: 'user' | 'expert' | 'system';
  actorId?: EntityId;
  action: string;
  entityType: string;
  entityId: EntityId;
  draftVersionId?: EntityId;
  metadata?: Record<string, unknown>;
}

export const logAudit = async (db: Database, input: AuditInput): Promise<void> => {
  await db.insert(auditLogTable).values({
    companyId: input.companyId,
    actorType: input.actorType,
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    draftVersionId: input.draftVersionId,
    metadata: input.metadata ?? {},
  });
};
