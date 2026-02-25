// PATH: apps/web/src/components/ui/StatusPill.tsx
// WHAT: Pill-компонент со статусом драфта в цветах pipeline
// WHY:  FR-062 — каждая карточка контента должна показывать status pill
// RELEVANT: apps/web/src/styles/tokens.css, apps/web/src/components/ui/ContentCard.tsx

import type { CSSProperties } from 'react';

/** Статусы из pipeline: Drafting → Factcheck → Needs Review → Approved | Revisions */
export type DraftStatus = 'drafting' | 'factcheck' | 'needs_review' | 'approved' | 'revisions';

const labels: Record<DraftStatus, string> = {
  drafting: 'Drafting',
  factcheck: 'Factcheck',
  needs_review: 'Needs Review',
  approved: 'Approved',
  revisions: 'Revisions',
};

/** CSS custom properties из tokens.css */
const colorMap: Record<DraftStatus, { color: string; bg: string }> = {
  drafting: { color: 'var(--status-drafting)', bg: 'var(--status-drafting-bg)' },
  factcheck: { color: 'var(--status-factcheck)', bg: 'var(--status-factcheck-bg)' },
  needs_review: { color: 'var(--status-needs-review)', bg: 'var(--status-needs-review-bg)' },
  approved: { color: 'var(--status-approved)', bg: 'var(--status-approved-bg)' },
  revisions: { color: 'var(--status-revisions)', bg: 'var(--status-revisions-bg)' },
};

interface StatusPillProps {
  status: DraftStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const { color, bg } = colorMap[status];

  const style: CSSProperties = {
    display: 'inline-block',
    padding: '2px 10px',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    borderRadius: 'var(--radius-full)',
    color,
    backgroundColor: bg,
    whiteSpace: 'nowrap',
  };

  return (
    <span style={style} className={className}>
      {labels[status]}
    </span>
  );
}
