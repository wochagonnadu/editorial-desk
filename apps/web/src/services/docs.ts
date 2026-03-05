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
    summary?: string | null;
    createdAt: string;
  } | null;
  versionContext: {
    current: { id: string; versionNumber: number; createdAt: string };
    base: { id: string; versionNumber: number; createdAt: string } | null;
  } | null;
  diff: {
    sourceVersion: { id: string; versionNumber: number } | null;
    targetVersion: { id: string; versionNumber: number };
    summary: string[];
  } | null;
  readOnly: boolean;
};

export const fetchPublicDoc = async (
  draftId: string,
  token: string,
  signal?: AbortSignal,
): Promise<PublicDoc> => {
  const raw = await apiRequest<unknown>(
    `/api/v1/docs/${draftId}?token=${encodeURIComponent(token)}`,
    { signal },
  );
  return mapDto<PublicDoc>(raw);
};
