// PATH: apps/web/src/pages/DraftsPage.tsx
// WHAT: Таблица черновиков с поиском/фильтрами и переходом в create flow
// WHY:  FR-027/028 — inventory + понятный вход в рабочее создание драфта
// RELEVANT: apps/web/src/components/drafts/DraftTable.tsx,apps/web/src/pages/CreateDraftPage.tsx

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DraftTable } from '../components/drafts/DraftTable';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useDraftsInventory } from './drafts/useDraftsInventory';

export const DraftsPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const inventory = useDraftsInventory(token);

  if (inventory.loading)
    return (
      <section style={{ padding: 'var(--space-6)' }}>
        <Skeleton variant="list" />
      </section>
    );

  if (
    !inventory.rows.length &&
    !inventory.search &&
    !inventory.status &&
    !inventory.expertId &&
    !inventory.risk
  ) {
    return (
      <EmptyState
        message="No drafts yet"
        description="Create your first draft to start the editorial pipeline."
        action={{ label: 'Create Draft', onClick: () => navigate('/drafts/new') }}
      />
    );
  }

  return (
    <section style={{ padding: 'var(--space-6)' }}>
      <div className="experts-header" style={{ marginBottom: 'var(--space-4)' }}>
        <h1>Drafts</h1>
        <button type="button" className="btn-primary" onClick={() => navigate('/drafts/new')}>
          Create Draft
        </button>
      </div>

      <div className="calendar-filter-row" style={{ marginBottom: 'var(--space-4)' }}>
        <input
          type="search"
          placeholder="Search by title, expert, reviewer..."
          value={inventory.search}
          onChange={(e) => inventory.setSearch(e.target.value)}
          className="experts-search"
        />
        <select value={inventory.status} onChange={(e) => inventory.setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="drafting">Drafting</option>
          <option value="factcheck">Factcheck</option>
          <option value="needs_review">Needs Review</option>
          <option value="approved">Approved</option>
          <option value="revisions">Revisions</option>
        </select>
        <select value={inventory.expertId} onChange={(e) => inventory.setExpertId(e.target.value)}>
          <option value="">All experts</option>
          {inventory.experts.map((expert) => (
            <option key={expert.value} value={expert.value}>
              {expert.label}
            </option>
          ))}
        </select>
        <select
          value={inventory.risk}
          onChange={(e) => inventory.setRisk(e.target.value as '' | 'low' | 'medium' | 'high')}
        >
          <option value="">All risk levels</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {!inventory.rows.length ? <EmptyState message="No drafts match filters" /> : null}

      {inventory.rows.length > 0 ? <DraftTable drafts={inventory.rows} /> : null}
    </section>
  );
};
