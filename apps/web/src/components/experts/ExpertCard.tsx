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
  const readiness = Math.max(0, Math.min(100, Math.round(props.voiceReadiness)));
  const tone =
    readiness >= 80
      ? 'var(--status-approved)'
      : readiness >= 50
        ? 'var(--color-warning)'
        : 'var(--color-danger)';

  return (
    <article className="expert-card card">
      <div className="expert-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="expert-avatar" aria-hidden>
            {initialsOf(props.name)}
          </div>
          <div>
            <h3 style={{ margin: 0 }}>
              <Link to={`/experts/${props.id}`}>{props.name}</Link>
            </h3>
            <small>{props.roleTitle}</small>
          </div>
        </div>

        <div
          className="expert-readiness"
          style={{
            background: `conic-gradient(${tone} ${readiness * 3.6}deg, var(--color-border-light) 0deg)`,
          }}
          aria-label={`Voice readiness ${readiness}%`}
        >
          <span>{readiness}%</span>
        </div>
      </div>

      <div className="expert-card-meta">
        <small>
          Last response:{' '}
          {props.lastResponseAt
            ? new Date(props.lastResponseAt).toLocaleDateString()
            : 'No response yet'}
        </small>
        <small>
          Drafts in progress: <strong>{props.draftsInProgress}</strong>
        </small>
      </div>

      <button className="btn-secondary expert-ping" onClick={() => props.onPing(props.id)}>
        Request 2 minutes
      </button>
    </article>
  );
}
