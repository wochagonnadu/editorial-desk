// PATH: apps/web/src/pages/DraftsPage.tsx
// WHAT: Kanban view for draft statuses and key metadata
// WHY:  Gives managers quick status overview across editorial pipeline
// RELEVANT: apps/web/src/services/editorial-api.ts,apps/web/src/pages/DraftDetailPage.tsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import type { DraftCard } from '../services/editorial-types';

const columns = ['drafting', 'factcheck', 'needs_review', 'approved', 'revisions'];

export const DraftsPage = () => {
  const { token } = useAuth();
  const [drafts, setDrafts] = useState<DraftCard[]>([]);

  useEffect(() => {
    if (!token) return;
    editorialApi.getDrafts(token).then((response) => setDrafts(response.data)).catch(() => undefined);
  }, [token]);

  return (
    <section className="kanban">
      {columns.map((status) => (
        <article className="card" key={status}>
          <h3>{status}</h3>
          <div className="list">
            {drafts.filter((draft) => draft.status === status).map((draft) => (
              <Link className="card" key={draft.id} to={`/drafts/${draft.id}`}>
                <strong>{draft.topic?.title ?? 'Untitled'}</strong>
                <span>{draft.expert?.name ?? 'No expert'}</span>
                <span>voice_score: {draft.voice_score ?? '-'}</span>
                <span>factcheck: {draft.factcheck_status}</span>
              </Link>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
};
