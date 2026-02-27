// PATH: apps/web/src/pages/Drafts.tsx
// WHAT: Drafts table page wired to GET /api/v1/drafts
// WHY:  Replaces local draft inventory with real API list data
// RELEVANT: apps/web/src/services/drafts.ts,apps/web/src/pages/DraftEditor.tsx

import { useEffect, useMemo, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchDrafts, type DraftListItem } from '../services/drafts';
import { useSession } from '../services/session';

const statusClass = (status: string): string => {
  if (status === 'needs_review') return 'status-review';
  if (status === 'drafting') return 'status-drafting';
  if (status === 'approved') return 'status-approved';
  if (status === 'revisions') return 'status-revisions';
  return 'status-factcheck';
};

const toStatusLabel = (status: string): string => status.replaceAll('_', ' ');

export function Drafts() {
  const { session } = useSession();
  const [items, setItems] = useState<DraftListItem[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        setError(null);
        setItems(await fetchDrafts(session.token));
      } catch {
        setError('Could not load drafts');
      }
    };
    void load();
  }, [session]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.title.toLowerCase().includes(needle));
  }, [items, query]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Drafts</h1>
          <p className="text-ink-500 mt-1">Inventory of all materials in progress.</p>
        </div>
        <Link to="/app/drafts/new" className="btn-primary">
          Create draft
        </Link>
      </header>

      {error ? <div className="card text-red-600">{error}</div> : null}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search drafts..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-ink-100 bg-white"
          />
        </div>
        <button className="btn-secondary" type="button">
          <Filter className="w-4 h-4 mr-2" /> Filter
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-beige-50 border-b border-ink-100">
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Expert
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Factcheck
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((draft) => (
                <tr key={draft.id} className="hover:bg-beige-50 transition-colors group">
                  <td className="py-4 px-4">
                    <Link
                      to={`/app/drafts/${draft.id}`}
                      className="font-medium text-ink-900 group-hover:text-terracotta-600"
                    >
                      {draft.title}
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-sm text-ink-500">{draft.expertName}</td>
                  <td className="py-4 px-4">
                    <span className={`status-pill ${statusClass(draft.status)}`}>
                      {toStatusLabel(draft.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-ink-500">{draft.factcheckStatus}</td>
                  <td className="py-4 px-4 text-sm text-ink-500">{draft.currentVersion ?? '-'}</td>
                  <td className="py-4 px-4 text-sm text-ink-500">
                    {new Date(draft.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ink-500">
                    No drafts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
