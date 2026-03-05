// PATH: apps/web/src/pages/Home.tsx
// WHAT: Home dashboard page wired to GET /api/v1/dashboard
// WHY:  Replaces static dashboard demo blocks with real backend aggregates
// RELEVANT: apps/web/src/services/dashboard.ts,apps/web/src/services/session.tsx

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchDashboard, type DashboardData } from '../services/dashboard';
import { useSession } from '../services/session';

const toRelative = (isoOrDate: string): string => {
  const value = new Date(isoOrDate).getTime();
  if (Number.isNaN(value)) return 'just now';
  const diff = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const statusLabel = (status: string): string =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function Home() {
  const { session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        setError(null);
        const next = await fetchDashboard(session.token);
        setData(next);
      } catch {
        setError('Could not load dashboard');
      }
    };
    void load();
  }, [session]);

  const greetingName = useMemo(() => {
    const email = session?.user.email ?? '';
    const name = email.split('@')[0] ?? 'editor';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [session]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Good morning, {greetingName}</h1>
          <p className="text-ink-500 mt-1">Here is what needs your attention today.</p>
        </div>
        <Link to="/app/drafts/new" className="btn-primary">
          Create draft
        </Link>
      </header>

      {error ? <div className="card text-red-600">{error}</div> : null}
      {!data ? (
        <div className="card text-ink-500">Loading dashboard...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-lg font-serif font-medium mb-4">Today's Actions</h2>
              <div className="space-y-3">
                {data.todayActions.length === 0 ? (
                  <div className="card text-ink-500">No actions for now.</div>
                ) : (
                  data.todayActions.map((action) => (
                    <div key={action.id} className="card p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-ink-900">{action.label}</h3>
                        <p className="text-sm text-ink-500 mt-0.5">
                          Status: {statusLabel(action.status)}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-ink-400" />
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif font-medium">In Review</h2>
                <Link
                  to="/app/approvals"
                  className="text-sm text-ink-500 hover:text-ink-900 font-medium"
                >
                  View all
                </Link>
              </div>
              <div className="card p-0 overflow-hidden">
                <ul className="divide-y divide-ink-100">
                  {data.inReview.length === 0 ? (
                    <li className="p-4 text-ink-500">No drafts in review.</li>
                  ) : (
                    data.inReview.map((item) => (
                      <li key={item.draftId} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-ink-900">{item.title}</p>
                          <div className="flex items-center text-sm text-ink-500 mt-1 space-x-3">
                            <span className="flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1" /> Waiting{' '}
                              {Math.ceil(item.timeInStatusSec / 3600)}h
                            </span>
                            <span>•</span>
                            <span>{item.reviewer || 'Reviewer unassigned'}</span>
                          </div>
                        </div>
                        <span className="status-pill status-review">
                          {statusLabel(item.status)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-serif font-medium mb-4">Team Pulse</h2>
              <div className="card space-y-4">
                {data.teamPulse.length === 0 ? (
                  <p className="text-sm text-ink-500">No experts yet.</p>
                ) : (
                  data.teamPulse.map((expert) => (
                    <div key={expert.expertId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-ink-900">{expert.name}</p>
                        <p className="text-xs text-ink-500">
                          Last response {toRelative(expert.lastResponseAt ?? '')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-ink-900">{expert.voiceReadiness}%</p>
                        <p className="text-xs text-ink-500">{expert.draftsInProgress} drafts</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-serif font-medium mb-4">This Week</h2>
              <div className="card space-y-3">
                {data.weekSchedule.length === 0 ? (
                  <p className="text-sm text-ink-500">No schedule items.</p>
                ) : (
                  data.weekSchedule.slice(0, 5).map((item) => (
                    <div key={item.draftId} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{item.title}</p>
                        <p className="text-xs text-ink-500">{item.expertName}</p>
                      </div>
                      <span className="text-xs text-ink-500">
                        {new Date(item.publishPlan.scheduledPublishAt).toISOString().slice(0, 10)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
