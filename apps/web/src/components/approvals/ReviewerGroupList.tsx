// PATH: apps/web/src/components/approvals/ReviewerGroupList.tsx
// WHAT: Approval items grouped by reviewer for reviewer-centric view
// WHY:  FR-040 — второй режим страницы approvals: by reviewer
// RELEVANT: apps/web/src/pages/ApprovalsPage.tsx,apps/web/src/components/approvals/StuckItemsList.tsx

import type { ApprovalListItem } from '@newsroom/shared';

interface ReviewerGroupListProps {
  items: ApprovalListItem[];
  onRemind: (stepId: string) => Promise<void>;
}

const grouped = (items: ApprovalListItem[]) =>
  items.reduce<Record<string, ApprovalListItem[]>>((acc, item) => {
    acc[item.reviewer] = [...(acc[item.reviewer] ?? []), item];
    return acc;
  }, {});

export function ReviewerGroupList({ items, onRemind }: ReviewerGroupListProps) {
  if (!items.length) return <p>No approvals assigned.</p>;
  const groups = grouped(items);

  return (
    <section className="card">
      <h3>By reviewer</h3>
      <div className="list">
        {Object.entries(groups).map(([reviewer, group]) => (
          <article key={reviewer} className="approval-step">
            <strong>{reviewer}</strong>
            <div>
              <small>{group.length} pending items</small>
            </div>
            <div className="list" style={{ marginTop: 'var(--space-2)' }}>
              {group.map((item) => (
                <div key={item.stepId} className="version-row">
                  {item.draftTitle} · {item.status} · {Math.floor(item.timeWaitingSec / 3600)}h
                  <div>
                    <button className="btn-secondary" onClick={() => onRemind(item.stepId)}>
                      Gentle reminder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
