// PATH: apps/web/src/services/docs.ts
// WHAT: Public docs API adapter for magic-link read-only document access
// WHY:  Keeps token-based document DTO mapping out of page components
// RELEVANT: apps/web/src/pages/PublicDoc.tsx,services/api/src/routes/docs.ts

import { apiRequest } from './api/client';
import { mapDto } from './api/mapper';

export type PublicDoc = {
  id: string;
  status: string;
  topic: { id: string; title: string } | null;
  expert: { id: string; name: string } | null;
  currentVersion: {
    id: string;
    versionNumber: number;
    content: string;
  } | null;
  readOnly: boolean;
};

export const fetchPublicDoc = async (draftId: string, token: string): Promise<PublicDoc> => {
  const raw = await apiRequest<unknown>(
    `/api/v1/docs/${draftId}?token=${encodeURIComponent(token)}`,
  );
  return mapDto<PublicDoc>(raw);
};
