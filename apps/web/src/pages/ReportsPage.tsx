// PATH: apps/web/src/pages/ReportsPage.tsx
// WHAT: Monthly owner reporting view with summary and delay list
// WHY:  Gives owners quick visibility into output and bottlenecks
// RELEVANT: apps/web/src/services/editorial-api.ts,services/api/src/routes/reports.ts

import { FormEvent, useEffect, useState } from 'react';
import { editorizeText } from '../constants/vocabulary';
import { Skeleton } from '../components/ui/Skeleton';
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
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    try {
      setReport(await editorialApi.getMonthlyReport(token, month));
    } catch (caught) {
      setMessage(
        editorizeText(caught instanceof Error ? caught.message : 'Could not load report yet'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token, month]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    load().catch(() => undefined);
  };

  if (loading) return <Skeleton variant="list" />;

  return (
    <section>
      <form className="card" onSubmit={submit}>
        <h2>Monthly report</h2>
        <div className="row">
          <input
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            placeholder="YYYY-MM"
          />
          <button className="btn-secondary" type="submit">
            Load
          </button>
        </div>
      </form>
      {message ? <p className="status-warning">{message}</p> : null}
      {report ? (
        <article className="card report-grid">
          <p>
            Created: <strong>{report.drafts_created}</strong>
          </p>
          <p>
            Approved: <strong>{report.drafts_approved}</strong>
          </p>
          <p>
            Pending: <strong>{report.drafts_pending}</strong>
          </p>
          <p>
            Avg approval days: <strong>{report.avg_approval_days}</strong>
          </p>
        </article>
      ) : null}
      <article className="card">
        <h3>Delays</h3>
        {report?.delays.length ? (
          report.delays.map((item, index) => (
            <div className="audit-row" key={`${item.draft_title}-${index}`}>
              {item.expert} | {item.draft_title} | {item.days_delayed} days
            </div>
          ))
        ) : (
          <p>No delays for selected period.</p>
        )}
      </article>
    </section>
  );
};
