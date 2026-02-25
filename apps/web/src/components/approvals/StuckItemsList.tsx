// PATH: apps/web/src/components/approvals/StuckItemsList.tsx
// WHAT: Список stuck approval items с действиями remind/forward
// WHY:  FR-040/041/042/043 — управление зависшими согласованиями
// RELEVANT: apps/web/src/pages/ApprovalsPage.tsx,apps/web/src/services/editorial-api.ts

import { useState } from 'react';
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
  if (!items.length) return <p>No stuck approvals right now.</p>;

  return (
    <section className="card">
      <h3>Stuck items</h3>
      <div className="list">
        {items.map((item) => (
          <article key={item.stepId} className="approval-step">
            <strong>{item.draftTitle}</strong>
            <div>
              <small>
                {item.reviewer} · {item.status} · {waitingLabel(item.timeWaitingSec)}
              </small>
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => onRemind(item.stepId)}>
                Gentle reminder
              </button>
              <select
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
                disabled={!selected[item.stepId]}
                onClick={() => onForward(item.stepId, selected[item.stepId])}
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
