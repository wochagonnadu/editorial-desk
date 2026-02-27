// PATH: apps/web/src/services/audit.ts
// WHAT: Audit API adapter for entity timeline rendering
// WHY:  Normalizes audit payload for editor and audit-related UI views
// RELEVANT: apps/web/src/pages/DraftEditor.tsx,apps/web/src/pages/Audit.tsx

import { apiRequest } from './api/client';

export type AuditEvent = {
  id: string;
  action: string;
  actorName: string;
  actorType?: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
};

type AuditResponse = {
  data: Array<{
    id: string;
    action: string;
    actor: { name: string; type?: string };
    entity_type?: string;
    entity_id?: string;
    created_at: string;
  }>;
};

export const fetchDraftAudit = async (token: string, draftId: string): Promise<AuditEvent[]> => {
  const query = `/api/v1/audit?entity_type=draft&entity_id=${encodeURIComponent(draftId)}&limit=20`;
  const response = await apiRequest<AuditResponse>(query, { token });
  return response.data.map((item) => ({
    id: item.id,
    action: item.action,
    actorName: item.actor.name,
    actorType: item.actor.type,
    entityType: item.entity_type,
    entityId: item.entity_id,
    createdAt: item.created_at,
  }));
};

export const fetchAuditFeed = async (token: string, limit = 50): Promise<AuditEvent[]> => {
  const query = `/api/v1/audit?limit=${Math.max(1, Math.min(limit, 200))}`;
  const response = await apiRequest<AuditResponse>(query, { token });
  return response.data.map((item) => ({
    id: item.id,
    action: item.action,
    actorName: item.actor.name,
    actorType: item.actor.type,
    entityType: item.entity_type,
    entityId: item.entity_id,
    createdAt: item.created_at,
  }));
};
