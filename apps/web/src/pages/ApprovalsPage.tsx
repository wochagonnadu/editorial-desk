// PATH: apps/web/src/pages/ApprovalsPage.tsx
// WHAT: Approvals screen with stuck/reviewer views and actions
// WHY:  FR-040..043 — менеджер отслеживает и разблокирует approvals
// RELEVANT: apps/web/src/components/approvals/StuckItemsList.tsx,apps/web/src/services/editorial-api.ts

import { useEffect, useMemo, useState } from 'react';
import type { ApprovalListItem } from '@newsroom/shared';
import { ReviewerGroupList } from '../components/approvals/ReviewerGroupList';
import { StuckItemsList } from '../components/approvals/StuckItemsList';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { editorialApi } from '../services/editorial-api';

export const ApprovalsPage = () => {
  const { token } = useAuth();
  const [view, setView] = useState<'stuck' | 'reviewer'>('stuck');
  const [items, setItems] = useState<ApprovalListItem[]>([]);
  const [reviewers, setReviewers] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const [approvals, experts] = await Promise.all([
      editorialApi.getApprovals(token, view).then((res) => res.data),
      apiClient.getExperts(token).then((res) => res.data),
    ]);
    setItems(approvals);
    setReviewers(
      experts.map((expert) => ({ id: expert.id, label: `${expert.name} (${expert.roleTitle})` })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => {
      setNote('Could not load approvals.');
      setLoading(false);
    });
  }, [token, view]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.timeWaitingSec - a.timeWaitingSec),
    [items],
  );

  if (!token) return null;
  if (loading) return <Skeleton variant="list" />;

  return (
    <section className="approvals-page">
      <header className="approvals-header card">
        <div>
          <h2 style={{ marginBottom: 'var(--space-1)' }}>Approvals</h2>
          <p className="experts-subtitle">Resolve bottlenecks and keep content moving.</p>
        </div>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button
            className={view === 'stuck' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setView('stuck')}
          >
            Stuck items
          </button>
          <button
            className={view === 'reviewer' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setView('reviewer')}
          >
            By reviewer
          </button>
        </div>
      </header>

      {note ? <p className="draft-editor-note">{note}</p> : null}
      {!sorted.length ? <EmptyState message="No approvals pending" /> : null}

      {view === 'stuck' ? (
        <StuckItemsList
          items={sorted}
          reviewers={reviewers}
          onRemind={async (stepId) => {
            await editorialApi.sendReminder(token, stepId);
            setNote('Gentle reminder sent.');
            await load();
          }}
          onForward={async (stepId, reviewerId) => {
            await editorialApi.forwardApproval(token, stepId, reviewerId);
            setNote('Forwarded to reviewer.');
            await load();
          }}
        />
      ) : null}
      {view === 'reviewer' ? (
        <ReviewerGroupList
          items={sorted}
          onRemind={async (stepId) => {
            await editorialApi.sendReminder(token, stepId);
            setNote('Gentle reminder sent.');
            await load();
          }}
        />
      ) : null}
    </section>
  );
};
