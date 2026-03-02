// PATH: packages/shared/src/types/audit.ts
// WHAT: Append-only audit log entity
// WHY:  Preserves traceability for compliance and debugging
// RELEVANT: packages/shared/src/types/common.ts,services/api/src/core/audit.ts

import type { EntityId, ISODateTime } from './common.js';

export interface AuditLog {
  id: EntityId;
  companyId: EntityId;
  actorType: 'user' | 'expert' | 'system';
  actorId?: EntityId;
  action: string;
  entityType: string;
  entityId: EntityId;
  draftVersionId?: EntityId;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
}
