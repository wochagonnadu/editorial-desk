// PATH: apps/web/src/components/editor/AuditTrailPanel.tsx
// WHAT: Панель audit trail (кто что сделал и когда)
// WHY:  FR-024 — прозрачный журнал действий рядом с редактором
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-types.ts

import type { AuditEntry } from '../../services/editorial-types';

interface AuditTrailPanelProps {
  entries: AuditEntry[];
}

export function AuditTrailPanel({ entries }: AuditTrailPanelProps) {
  if (!entries.length) {
    return <p>No audit events yet.</p>;
  }

  return (
    <section className="card" style={{ margin: 0 }}>
      <h4>Audit Trail</h4>
      <div className="list">
        {entries.map((entry) => (
          <article key={entry.id} className="audit-row">
            <strong>{entry.action}</strong>
            <div>
              <small>
                {entry.actor.name} · {new Date(entry.created_at).toLocaleString()}
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
