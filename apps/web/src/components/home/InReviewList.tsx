// PATH: apps/web/src/components/home/InReviewList.tsx
// WHAT: Список черновиков в Needs Review с индикатором срочности
// WHY:  FR-011 — показывать items с самым долгим time-in-status наверху
// RELEVANT: apps/web/src/pages/HomePage.tsx,apps/web/src/components/ui/ContentCard.tsx

import type { InReviewItem } from '@newsroom/shared';
import { ContentCard } from '../ui/ContentCard';

interface InReviewListProps {
  items: InReviewItem[];
  onOpenDraft: (draftId: string) => void;
}

const isUrgent = (timeInStatusSec: number): boolean => timeInStatusSec > 48 * 60 * 60;

export function InReviewList({ items, onOpenDraft }: InReviewListProps) {
  if (!items.length) {
    return <p>No drafts waiting for review.</p>;
  }

  return (
    <section className="card">
      <h3>In Review</h3>
      <div className="list">
        {items.map((item) => (
          <div key={item.draftId} style={{ display: 'grid', gap: 'var(--space-1)' }}>
            <ContentCard
              title={item.title}
              status="needs_review"
              reviewer={item.reviewer || 'Reviewer pending'}
              deadline={item.deadline}
              onClick={() => onOpenDraft(item.draftId)}
            />
            {isUrgent(item.timeInStatusSec) ? (
              <small className="status-warning">Needs attention: waiting over 48h</small>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
