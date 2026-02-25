// PATH: apps/web/src/components/home/TeamPulse.tsx
// WHAT: Блок Team Pulse с readiness, last response и workload
// WHY:  FR-013 — менеджер видит состояние экспертов в одном месте
// RELEVANT: apps/web/src/pages/HomePage.tsx,packages/shared/src/types/dashboard.ts

import type { TeamPulseItem } from '@newsroom/shared';

interface TeamPulseProps {
  items: TeamPulseItem[];
}

const daysSince = (iso?: string): number => {
  if (!iso) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
};

export function TeamPulse({ items }: TeamPulseProps) {
  if (!items.length) {
    return <p>Add your first expert to see team pulse.</p>;
  }

  return (
    <section className="card">
      <h3>Team Pulse</h3>
      <div className="list">
        {items.map((item) => {
          const stale = daysSince(item.lastResponseAt) > 7;
          return (
            <article key={item.expertId} className="approval-step">
              <div
                style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}
              >
                <strong>{item.name}</strong>
                <span>{item.voiceReadiness}% readiness</span>
              </div>
              <small>
                {item.lastResponseAt
                  ? `Last response: ${new Date(item.lastResponseAt).toLocaleDateString()}`
                  : 'No response yet'}
                {stale ? ' · needs a gentle reminder' : ''}
              </small>
              <div>
                <small>Drafts in progress: {item.draftsInProgress}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
