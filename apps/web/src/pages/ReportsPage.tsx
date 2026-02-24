// PATH: apps/web/src/pages/ReportsPage.tsx
// WHAT: Monthly owner reporting view with summary and delay list
// WHY:  Gives owners quick visibility into output and bottlenecks
// RELEVANT: apps/web/src/services/editorial-api.ts,services/api/src/routes/reports.ts

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import type { MonthlyReport } from '../services/editorial-types';

const currentMonth = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const ReportsPage = () => {
  const { token } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) return;
    setError('');
    try {
      setReport(await editorialApi.getMonthlyReport(token, month));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load report');
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token, month]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    load().catch(() => undefined);
  };

  return (
    <section>
      <form className="card" onSubmit={submit}><h2>Monthly report</h2><div className="row"><input value={month} onChange={(event) => setMonth(event.target.value)} placeholder="YYYY-MM" /><button type="submit">Load</button></div></form>
      {error ? <p className="error">{error}</p> : null}
      {report ? <article className="card report-grid"><p>Created: <strong>{report.drafts_created}</strong></p><p>Approved: <strong>{report.drafts_approved}</strong></p><p>Pending: <strong>{report.drafts_pending}</strong></p><p>Avg approval days: <strong>{report.avg_approval_days}</strong></p></article> : null}
      <article className="card"><h3>Delays</h3>{report?.delays.length ? report.delays.map((item, index) => <div className="audit-row" key={`${item.draft_title}-${index}`}>{item.expert} | {item.draft_title} | {item.days_delayed} days</div>) : <p>No delays for selected period.</p>}</article>
    </section>
  );
};
