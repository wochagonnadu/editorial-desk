// PATH: apps/web/src/components/home/TodayActions.tsx
// WHAT: Блок Today Actions с приоритетными действиями редактора
// WHY:  FR-010 — менеджер сразу видит 3-5 ключевых действий
// RELEVANT: apps/web/src/pages/HomePage.tsx,apps/web/src/components/ui/ContentCard.tsx

import type { TodayAction } from '@newsroom/shared';
import { ContentCard } from '../ui/ContentCard';

interface TodayActionsProps {
  actions: TodayAction[];
  onOpen: (targetType: TodayAction['targetType'], targetId: string) => void;
}

const statusByType: Record<TodayAction['type'], 'drafting' | 'factcheck' | 'needs_review'> = {
  approve_topics: 'drafting',
  draft_ready: 'needs_review',
  facts_to_confirm: 'factcheck',
  reminder_needed: 'drafting',
};

const titleByType: Record<TodayAction['type'], string> = {
  approve_topics: 'Approve weekly topics',
  draft_ready: 'Draft ready for review',
  facts_to_confirm: 'Facts to confirm',
  reminder_needed: 'Gentle reminder needed',
};

export function TodayActions({ actions, onOpen }: TodayActionsProps) {
  if (!actions.length) {
    return <p>No urgent actions today.</p>;
  }

  return (
    <section className="card">
      <h3>Today&apos;s Actions</h3>
      <div className="list">
        {actions.slice(0, 5).map((action) => (
          <ContentCard
            key={action.id}
            title={titleByType[action.type]}
            status={statusByType[action.type]}
            onClick={() => onOpen(action.targetType, action.targetId)}
          />
        ))}
      </div>
    </section>
  );
}
