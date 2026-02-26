// PATH: apps/web/src/components/approvals/StuckItemsList.tsx
// WHAT: Список stuck approval items с действиями remind/forward
// WHY:  FR-040/041/042/043 — управление зависшими согласованиями
// RELEVANT: apps/web/src/pages/ApprovalsPage.tsx,apps/web/src/services/editorial-api.ts

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApprovalListItem } from '@newsroom/shared';

interface ReviewerOption {
  id: string;
  label: string;
}

interface StuckItemsListProps {
  items: ApprovalListItem[];
  reviewers: ReviewerOption[];
  onRemind: (stepId: string) => Promise<void>;
  onForward: (stepId: string, reviewerId: string) => Promise<void>;
}

const waitingLabel = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours}h waiting`;
  return `${Math.floor(hours / 24)}d waiting`;
};

export function StuckItemsList({ items, reviewers, onRemind, onForward }: StuckItemsListProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyStepId, setBusyStepId] = useState<string>('');

  if (!items.length) return <p>No stuck approvals right now.</p>;

  return (
    <section className="approvals-list">
      <h3 style={{ margin: 0 }}>Stuck items</h3>
      <div className="list" style={{ marginTop: 'var(--space-2)' }}>
        {items.map((item) => (
          <article key={item.stepId} className="approval-item card">
            <div className="approval-item-top">
              <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                <strong>
                  <Link to={`/drafts/${item.draftId}`}>{item.draftTitle}</Link>
                </strong>
                <small>
                  Waiting on {item.reviewer} · {item.status} · {waitingLabel(item.timeWaitingSec)}
                </small>
              </div>
              <span className={item.timeWaitingSec > 48 * 3600 ? 'status-warning' : ''}>
                {item.timeWaitingSec > 48 * 3600 ? 'Urgent' : 'In progress'}
              </span>
            </div>

            <div className="approval-item-actions">
              <button
                className="btn-secondary"
                disabled={busyStepId === item.stepId}
                onClick={async () => {
                  setBusyStepId(item.stepId);
                  try {
                    await onRemind(item.stepId);
                  } finally {
                    setBusyStepId('');
                  }
                }}
              >
                Gentle reminder
              </button>
              <select
                className="approval-forward-select"
                value={selected[item.stepId] ?? ''}
                onChange={(e) => setSelected((s) => ({ ...s, [item.stepId]: e.target.value }))}
              >
                <option value="">Select reviewer...</option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.label}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary"
                disabled={!selected[item.stepId] || busyStepId === item.stepId}
                onClick={async () => {
                  setBusyStepId(item.stepId);
                  try {
                    await onForward(item.stepId, selected[item.stepId]);
                    setSelected((current) => ({ ...current, [item.stepId]: '' }));
                  } finally {
                    setBusyStepId('');
                  }
                }}
              >
                Forward to reviewer
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
