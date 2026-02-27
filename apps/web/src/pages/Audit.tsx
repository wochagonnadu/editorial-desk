// PATH: apps/web/src/pages/Audit.tsx
// WHAT: Audit timeline screen wired to GET /api/v1/audit
// WHY:  Gives managers a live, centralized action history for transparency
// RELEVANT: apps/web/src/services/audit.ts,apps/web/src/App.tsx

import { useEffect, useState } from 'react';
import { fetchAuditFeed, type AuditEvent } from '../services/audit';
import { useSession } from '../services/session';

export function Audit() {
  const { session } = useSession();
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        setError(null);
        setItems(await fetchAuditFeed(session.token, 50));
      } catch {
        setError('Could not load audit log');
      }
    };
    void load();
  }, [session]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-serif">Audit Log</h1>
        <p className="text-ink-500 mt-1">Recent actions from your workspace.</p>
      </header>

      {error ? <div className="card text-red-600">{error}</div> : null}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-beige-50 border-b border-ink-100">
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Actor
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-beige-50 transition-colors">
                  <td className="py-4 px-4 text-sm text-ink-900">{item.action}</td>
                  <td className="py-4 px-4 text-sm text-ink-500">{item.actorName}</td>
                  <td className="py-4 px-4 text-sm text-ink-500">
                    {item.entityType ?? '-'}:{item.entityId ?? '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-ink-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-ink-500">
                    No audit events yet.
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
