// PATH: apps/web/src/services/audit.ts
// WHAT: Audit API adapter for entity timeline rendering
// WHY:  Normalizes audit payload for editor and audit-related UI views
// RELEVANT: apps/web/src/pages/DraftEditor.tsx,apps/web/src/services/api/client.ts

import { apiRequest } from './api/client';

export type AuditEvent = {
  id: string;
  action: string;
  actorName: string;
  createdAt: string;
};

type AuditResponse = {
  data: Array<{
    id: string;
    action: string;
    actor: { name: string };
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
    createdAt: item.created_at,
  }));
};
