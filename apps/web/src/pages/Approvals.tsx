// PATH: apps/web/src/pages/Approvals.tsx
// WHAT: Approvals queue page wired to decision/remind/forward API endpoints
// WHY:  Replaces static bottleneck list with real pending approval steps
// RELEVANT: apps/web/src/services/approvals.ts,apps/web/src/services/experts.ts

import { useEffect, useMemo, useState } from 'react';
import { Clock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  decideApprovalStep,
  fetchApprovals,
  forwardApprovalStep,
  sendApprovalReminder,
  type ApprovalItem,
} from '../services/approvals';
import { ApiError } from '../services/api/client';
import { fetchExperts } from '../services/experts';
import { useSession } from '../services/session';

const waitingLabel = (sec: number) => {
  if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
};

export function Approvals() {
  const { session } = useSession();
  const [mode, setMode] = useState<'stuck' | 'reviewer'>('stuck');
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<Record<string, string>>({});
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [forwardTo, setForwardTo] = useState<Record<string, string>>({});
  const [requestChangesOpenFor, setRequestChangesOpenFor] = useState<string | null>(null);
  const [requestChangesComment, setRequestChangesComment] = useState<Record<string, string>>({});
  const [experts, setExperts] = useState<Array<{ id: string; name: string }>>([]);

  const load = async (currentMode: 'stuck' | 'reviewer') => {
    if (!session) return;
    const [nextItems, nextExperts] = await Promise.all([
      fetchApprovals(session.token, currentMode),
      fetchExperts(session.token),
    ]);
    setItems(nextItems);
    setExperts(nextExperts.map((item) => ({ id: item.id, name: item.name })));
  };

  useEffect(() => {
    if (!session) return;
    const run = async () => {
      try {
        setLoadError(null);
        await load(mode);
      } catch {
        setLoadError('Could not load approvals');
      }
    };
    void run();
  }, [mode, session]);

  const grouped = useMemo(() => {
    if (mode === 'stuck') return items;
    return [...items].sort((a, b) => a.reviewer.localeCompare(b.reviewer));
  }, [items, mode]);

  const remind = async (stepId: string) => {
    if (!session) return;
    try {
      setStepError((current) => ({ ...current, [stepId]: '' }));
      setBusyStepId(stepId);
      await sendApprovalReminder(session.token, stepId);
    } catch {
      setStepError((current) => ({ ...current, [stepId]: 'Could not send reminder' }));
    } finally {
      setBusyStepId(null);
    }
  };

  const forward = async (stepId: string) => {
    if (!session) return;
    const reviewerId = forwardTo[stepId];
    if (!reviewerId) return;
    try {
      setStepError((current) => ({ ...current, [stepId]: '' }));
      setBusyStepId(stepId);
      await forwardApprovalStep(session.token, stepId, reviewerId);
      await load(mode);
    } catch {
      setStepError((current) => ({ ...current, [stepId]: 'Could not forward reviewer' }));
    } finally {
      setBusyStepId(null);
    }
  };

  const approve = async (item: ApprovalItem) => {
    if (!session || !item.currentVersionId) {
      setStepError((current) => ({
        ...current,
        [item.stepId]: 'Draft has no current version for approval decision',
      }));
      return;
    }
    try {
      setStepError((current) => ({ ...current, [item.stepId]: '' }));
      setBusyStepId(item.stepId);
      await decideApprovalStep(session.token, item.stepId, {
        action: 'approve',
        expectedCurrentVersionId: item.currentVersionId,
      });
      await load(mode);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setStepError((current) => ({ ...current, [item.stepId]: requestError.message }));
      } else {
        setStepError((current) => ({ ...current, [item.stepId]: 'Could not approve step' }));
      }
    } finally {
      setBusyStepId(null);
    }
  };

  const requestChanges = async (item: ApprovalItem) => {
    if (!session || !item.currentVersionId) {
      setStepError((current) => ({
        ...current,
        [item.stepId]: 'Draft has no current version for approval decision',
      }));
      return;
    }
    const comment = (requestChangesComment[item.stepId] ?? '').trim();
    if (comment.length < 5) {
      setStepError((current) => ({
        ...current,
        [item.stepId]: 'Please add at least 5 characters for request changes',
      }));
      return;
    }
    try {
      setStepError((current) => ({ ...current, [item.stepId]: '' }));
      setBusyStepId(item.stepId);
      await decideApprovalStep(session.token, item.stepId, {
        action: 'request_changes',
        expectedCurrentVersionId: item.currentVersionId,
        comment,
      });
      setRequestChangesOpenFor((current) => (current === item.stepId ? null : current));
      setRequestChangesComment((prev) => ({ ...prev, [item.stepId]: '' }));
      await load(mode);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setStepError((current) => ({ ...current, [item.stepId]: requestError.message }));
      } else {
        setStepError((current) => ({ ...current, [item.stepId]: 'Could not request changes' }));
      }
    } finally {
      setBusyStepId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Approvals</h1>
          <p className="text-ink-500 mt-1">Resolve bottlenecks and keep content moving.</p>
        </div>
      </header>

      {loadError ? <div className="card text-red-600">{loadError}</div> : null}

      <div className="flex items-center space-x-4 border-b border-ink-100 pb-4">
        <button
          onClick={() => setMode('stuck')}
          className={`text-sm font-medium px-4 py-2 rounded-xl ${mode === 'stuck' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-beige-100'}`}
        >
          Stuck items
        </button>
        <button
          onClick={() => setMode('reviewer')}
          className={`text-sm font-medium px-4 py-2 rounded-xl ${mode === 'reviewer' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-beige-100'}`}
        >
          By reviewer
        </button>
      </div>

      <div className="space-y-4">
        {grouped.length === 0 ? (
          <div className="card text-ink-500">No pending approvals.</div>
        ) : (
          grouped.map((item) => {
            const isUrgent = item.timeWaitingSec > 86_400;
            return (
              <div key={item.stepId} className="card p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`mt-1 p-2 rounded-full ${isUrgent ? 'bg-terracotta-500/10 text-terracotta-600' : 'bg-warning-100 text-warning-700'}`}
                    >
                      {isUrgent ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <Link
                        to={`/app/drafts/${item.draftId}`}
                        className="text-lg font-medium text-ink-900 hover:text-terracotta-600"
                      >
                        {item.draftTitle}
                      </Link>
                      <p className="text-sm text-ink-500 mt-1">
                        Waiting on <span className="font-medium text-ink-900">{item.reviewer}</span>{' '}
                        • {waitingLabel(item.timeWaitingSec)}
                      </p>
                    </div>
                  </div>
                  <span className="status-pill status-review">{item.status}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="btn-primary py-2 px-4 text-sm"
                    onClick={() => approve(item)}
                    disabled={busyStepId === item.stepId}
                  >
                    {busyStepId === item.stepId ? 'Saving...' : 'Approve'}
                  </button>

                  <button
                    className="btn-secondary py-2 px-4 text-sm"
                    onClick={() =>
                      setRequestChangesOpenFor((current) =>
                        current === item.stepId ? null : item.stepId,
                      )
                    }
                    disabled={busyStepId === item.stepId}
                  >
                    Request changes
                  </button>

                  <button
                    className="btn-secondary py-2 px-4 text-sm"
                    onClick={() => remind(item.stepId)}
                    disabled={busyStepId === item.stepId}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {busyStepId === item.stepId ? 'Sending...' : 'Gentle reminder'}
                  </button>

                  <select
                    value={forwardTo[item.stepId] ?? ''}
                    onChange={(event) =>
                      setForwardTo((prev) => ({ ...prev, [item.stepId]: event.target.value }))
                    }
                    className="px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm"
                  >
                    <option value="">Forward to expert...</option>
                    {experts.map((expert) => (
                      <option key={expert.id} value={expert.id}>
                        {expert.name}
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn-secondary py-2 px-4 text-sm"
                    onClick={() => forward(item.stepId)}
                    disabled={busyStepId === item.stepId || !forwardTo[item.stepId]}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Forward
                  </button>
                </div>

                {requestChangesOpenFor === item.stepId ? (
                  <div className="space-y-2">
                    <textarea
                      value={requestChangesComment[item.stepId] ?? ''}
                      onChange={(event) =>
                        setRequestChangesComment((prev) => ({
                          ...prev,
                          [item.stepId]: event.target.value,
                        }))
                      }
                      className="w-full min-h-24 rounded-xl border border-ink-200 p-3 text-sm"
                      placeholder="What should be changed before approval?"
                    />
                    <div className="flex justify-end">
                      <button
                        className="btn-secondary py-2 px-4 text-sm"
                        onClick={() => requestChanges(item)}
                        disabled={busyStepId === item.stepId}
                      >
                        {busyStepId === item.stepId ? 'Saving...' : 'Submit request changes'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {stepError[item.stepId] ? (
                  <p className="text-sm text-red-600">{stepError[item.stepId]}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
