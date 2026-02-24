// PATH: apps/web/src/pages/AuditPage.tsx
// WHAT: Audit trail page with basic filters and pagination controls
// WHY:  Gives team visibility into who did what and when
// RELEVANT: apps/web/src/services/editorial-api.ts,services/api/src/routes/audit.ts

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import type { AuditEntry } from '../services/editorial-types';

export const AuditPage = () => {
  const { token } = useAuth();
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<AuditEntry[]>([]);

  const load = async () => {
    if (!token) return;
    const response = await editorialApi.getAudit(token, {
      entity_type: entityType || undefined,
      entity_id: entityId || undefined,
      limit,
      offset,
    });
    setRows(response.data);
    setTotal(response.total);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token, entityType, entityId, offset]);

  const applyFilter = (event: FormEvent) => {
    event.preventDefault();
    setOffset(0);
    load().catch(() => undefined);
  };

  return (
    <section>
      <form className="card" onSubmit={applyFilter}>
        <h2>Audit log</h2>
        <div className="row"><input value={entityType} placeholder="entity_type" onChange={(event) => setEntityType(event.target.value)} /><input value={entityId} placeholder="entity_id" onChange={(event) => setEntityId(event.target.value)} /><button type="submit">Apply</button></div>
      </form>
      <article className="card audit-table">
        {rows.map((item) => (
          <div className="audit-row" key={item.id}>
            <strong>{item.action}</strong> | {item.actor.name} ({item.actor.type}) | {item.entity_type}:{item.entity_id} | {item.created_at}
          </div>
        ))}
        {rows.length === 0 ? <p>No audit events found.</p> : null}
      </article>
      <div className="row"><button disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - limit))}>Prev</button><button disabled={offset + limit >= total} onClick={() => setOffset((value) => value + limit)}>Next</button><span>{offset + 1}-{Math.min(offset + limit, total)} of {total}</span></div>
    </section>
  );
};
