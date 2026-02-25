// PATH: apps/web/src/components/experts/ExpertCard.tsx
// WHAT: Карточка эксперта с readiness, workload и кнопкой Request 2 minutes
// WHY:  FR-030/FR-032 — единый формат отображения и действия по эксперту
// RELEVANT: apps/web/src/pages/ExpertsPage.tsx,apps/web/src/services/api.ts

import { Link } from 'react-router-dom';

interface ExpertCardProps {
  id: string;
  name: string;
  roleTitle: string;
  voiceReadiness: number;
  lastResponseAt?: string;
  draftsInProgress: number;
  onPing: (expertId: string) => Promise<void>;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export function ExpertCard(props: ExpertCardProps) {
  return (
    <article className="card" style={{ gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div
          aria-hidden
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--color-bg-alt)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
          }}
        >
          {initialsOf(props.name)}
        </div>
        <div>
          <h3 style={{ margin: 0 }}>
            <Link to={`/experts/${props.id}`}>{props.name}</Link>
          </h3>
          <small>{props.roleTitle}</small>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
        <small>Voice readiness: {props.voiceReadiness}%</small>
        <small>
          Last response:{' '}
          {props.lastResponseAt
            ? new Date(props.lastResponseAt).toLocaleString()
            : 'No response yet'}
        </small>
        <small>Drafts in progress: {props.draftsInProgress}</small>
      </div>

      <button className="btn-secondary" onClick={() => props.onPing(props.id)}>
        Request 2 minutes
      </button>
    </article>
  );
}
