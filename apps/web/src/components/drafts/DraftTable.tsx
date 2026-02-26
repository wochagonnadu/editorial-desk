// PATH: apps/web/src/components/drafts/DraftTable.tsx
// WHAT: Сортируемая таблица черновиков (замена Kanban)
// WHY:  FR-027 — title, expert, status, risk, factcheck, last updated + сортировка
// RELEVANT: apps/web/src/pages/DraftsPage.tsx, apps/web/src/components/ui/StatusPill.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DraftCard } from '../../services/editorial-types';
import { StatusPill, type DraftStatus } from '../ui/StatusPill';

type SortKey = 'title' | 'expert' | 'status' | 'risk' | 'factcheck' | 'reviewer' | 'updated';
type SortDir = 'asc' | 'desc';
export interface DraftTableItem extends DraftCard {
  risk: 'low' | 'medium' | 'high';
  reviewer: string;
}

interface Props {
  drafts: DraftTableItem[];
}

const sortFns: Record<SortKey, (a: DraftTableItem, b: DraftTableItem) => number> = {
  title: (a, b) => (a.topic?.title ?? '').localeCompare(b.topic?.title ?? ''),
  expert: (a, b) => (a.expert?.name ?? '').localeCompare(b.expert?.name ?? ''),
  status: (a, b) => a.status.localeCompare(b.status),
  risk: (a, b) => a.risk.localeCompare(b.risk),
  factcheck: (a, b) => a.factcheck_status.localeCompare(b.factcheck_status),
  reviewer: (a, b) => a.reviewer.localeCompare(b.reviewer),
  updated: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
};

const headers: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'expert', label: 'Expert' },
  { key: 'status', label: 'Status' },
  { key: 'risk', label: 'Risk' },
  { key: 'factcheck', label: 'Factcheck' },
  { key: 'reviewer', label: 'Next Reviewer' },
  { key: 'updated', label: 'Last Updated' },
];

export function DraftTable({ drafts }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...drafts].sort((a, b) => {
    const cmp = sortFns[sortKey](a, b);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };
  const riskLabel = (risk: DraftTableItem['risk']) =>
    risk === 'high' ? 'High' : risk === 'medium' ? 'Medium' : 'Low';

  return (
    <table className="draft-table">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h.key} onClick={() => handleSort(h.key)} style={{ cursor: 'pointer' }}>
              {h.label} {sortKey === h.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((d) => (
          <tr key={d.id}>
            <td>
              <Link to={`/drafts/${d.id}`}>{d.topic?.title ?? 'Untitled'}</Link>
            </td>
            <td>{d.expert?.name ?? '—'}</td>
            <td>
              <StatusPill status={d.status as DraftStatus} />
            </td>
            <td>{riskLabel(d.risk)}</td>
            <td>{d.factcheck_status}</td>
            <td>{d.reviewer}</td>
            <td>{relTime(d.updated_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
