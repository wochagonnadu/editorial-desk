// PATH: apps/web/src/pages/DraftsPage.tsx
// WHAT: Таблица черновиков с поиском, сортировкой и модалкой создания
// WHY:  FR-027/028 — searchable sortable table + create draft action
// RELEVANT: apps/web/src/components/drafts/DraftTable.tsx, apps/web/src/components/drafts/CreateDraftModal.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import type { DraftCard } from '../services/editorial-types';
import { DraftTable } from '../components/drafts/DraftTable';
import { CreateDraftModal } from '../components/drafts/CreateDraftModal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export const DraftsPage = () => {
  const { token } = useAuth();
  const [drafts, setDrafts] = useState<DraftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDrafts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await editorialApi.getDrafts(token);
      setDrafts(response.data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Поиск по title и expert name
  const filtered = useMemo(() => {
    if (!search) return drafts;
    const q = search.toLowerCase();
    return drafts.filter(
      (d) =>
        (d.topic?.title ?? '').toLowerCase().includes(q) ||
        (d.expert?.name ?? '').toLowerCase().includes(q),
    );
  }, [drafts, search]);

  if (loading)
    return (
      <section style={{ padding: 'var(--space-6)' }}>
        <Skeleton variant="list" />
      </section>
    );

  if (!drafts.length) {
    return (
      <EmptyState
        message="No drafts yet"
        description="Create your first draft to start the editorial pipeline."
        action={{ label: 'Create Draft', onClick: () => setModalOpen(true) }}
      />
    );
  }

  return (
    <section style={{ padding: 'var(--space-6)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
        }}
      >
        <h1>Drafts</h1>
        <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
          Create Draft
        </button>
      </div>

      <input
        type="search"
        placeholder="Search by title or expert..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 360,
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      />

      <DraftTable drafts={filtered} />

      <CreateDraftModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          fetchDrafts();
        }}
      />
    </section>
  );
};
