// PATH: apps/web/src/pages/drafts/useDraftsInventory.ts
// WHAT: Draft inventory data loader with API-backed filters and reviewer mapping
// WHY:  Keeps Drafts page focused on UI while preserving business fields (risk/reviewer)
// RELEVANT: apps/web/src/pages/DraftsPage.tsx,apps/web/src/components/drafts/DraftTable.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ApprovalListItem } from '@newsroom/shared';
import { apiClient } from '../../services/api';
import { editorialApi } from '../../services/editorial-api';
import type { DraftCard } from '../../services/editorial-types';
import type { DraftTableItem } from '../../components/drafts/DraftTable';

export type RiskFilter = '' | 'low' | 'medium' | 'high';

export const toRisk = (factcheckStatus: string): Exclude<RiskFilter, ''> => {
  if (factcheckStatus === 'failed') return 'high';
  if (factcheckStatus === 'pending') return 'medium';
  return 'low';
};

const toReviewerMap = (items: ApprovalListItem[]): Record<string, string> =>
  items.reduce<Record<string, string>>((acc, item) => {
    if (!acc[item.draftId]) acc[item.draftId] = item.reviewer;
    return acc;
  }, {});

export function useDraftsInventory(token: string | null) {
  const [drafts, setDrafts] = useState<DraftCard[]>([]);
  const [reviewersByDraftId, setReviewersByDraftId] = useState<Record<string, string>>({});
  const [experts, setExperts] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [expertId, setExpertId] = useState('');
  const [risk, setRisk] = useState<RiskFilter>('');

  const fetchDrafts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [draftResponse, expertResponse, approvalsResponse] = await Promise.all([
        editorialApi.getDrafts(token, {
          status: status || undefined,
          expertId: expertId || undefined,
        }),
        apiClient.getExperts(token),
        editorialApi
          .getApprovals(token, 'reviewer')
          .catch(() => ({ data: [] as ApprovalListItem[] })),
      ]);
      setDrafts(draftResponse.data);
      setExperts(expertResponse.data.map((item) => ({ value: item.id, label: item.name })));
      setReviewersByDraftId(toReviewerMap(approvalsResponse.data));
    } finally {
      setLoading(false);
    }
  }, [token, status, expertId]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drafts
      .map<DraftTableItem>((draft) => ({
        ...draft,
        risk: toRisk(draft.factcheck_status),
        reviewer: reviewersByDraftId[draft.id] ?? 'Not assigned',
      }))
      .filter((draft) => {
        if (risk && draft.risk !== risk) return false;
        if (!q) return true;
        return (
          (draft.topic?.title ?? '').toLowerCase().includes(q) ||
          (draft.expert?.name ?? '').toLowerCase().includes(q) ||
          draft.reviewer.toLowerCase().includes(q)
        );
      });
  }, [drafts, reviewersByDraftId, risk, search]);

  const unknownStatuses = useMemo(
    () =>
      [...new Set(drafts.map((draft) => draft.status))].filter(
        (value) =>
          !['drafting', 'factcheck', 'needs_review', 'approved', 'revisions'].includes(value),
      ),
    [drafts],
  );

  return {
    loading,
    rows,
    experts,
    search,
    setSearch,
    status,
    setStatus,
    expertId,
    setExpertId,
    risk,
    setRisk,
    unknownStatuses,
    refresh: fetchDrafts,
  };
}
