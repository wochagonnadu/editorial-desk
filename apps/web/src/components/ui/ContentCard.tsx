// PATH: apps/web/src/components/ui/ContentCard.tsx
// WHAT: Универсальная карточка контента (title, status pill, reviewer, deadline)
// WHY:  FR-062 — единый формат для Home, Drafts, Calendar
// RELEVANT: apps/web/src/components/ui/StatusPill.tsx, apps/web/src/styles/tokens.css

import type { CSSProperties } from 'react';
import { StatusPill, type DraftStatus } from './StatusPill';

export interface ContentCardProps {
  title: string;
  status: DraftStatus;
  reviewer?: string;
  deadline?: string;
  /** Имя эксперта (для Calendar и списков) */
  expertName?: string;
  onClick?: () => void;
}

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-2)',
  padding: 'var(--space-4)',
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  cursor: 'pointer',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
};

const titleStyle: CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const metaStyle: CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
};

export function ContentCard({
  title,
  status,
  reviewer,
  deadline,
  expertName,
  onClick,
}: ContentCardProps) {
  return (
    <div
      style={cardStyle}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div style={headerStyle}>
        <h4 style={titleStyle}>{title}</h4>
        <StatusPill status={status} />
      </div>
      <div style={metaStyle}>
        {expertName && <span>{expertName}</span>}
        {reviewer && (
          <span>
            {expertName ? ' · ' : ''}Reviewer: {reviewer}
          </span>
        )}
        {deadline && <span> · Due: {deadline}</span>}
      </div>
    </div>
  );
}
