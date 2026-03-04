// PATH: apps/web/src/pages/ExpertProfile.tsx
// WHAT: Expert detail page wired to GET /api/v1/experts/:id and drafts filter
// WHY:  Replaces static expert profile with live backend profile and draft list
// RELEVANT: apps/web/src/services/experts.ts,apps/web/src/services/drafts.ts

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Mail, FileText, Clock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { fetchDrafts, type DraftListItem } from '../services/drafts';
import { fetchExpertDetail, requestExpertPing, type ExpertDetail } from '../services/experts';
import { useSession } from '../services/session';

const toRelative = (value: string) => {
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return 'recently';
  const sec = Math.floor((Date.now() - date) / 1000);
  if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))} minutes ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
};

const onboardingStatusLabel: Record<'active' | 'stalled' | 'completed', string> = {
  active: 'Active',
  stalled: 'Stalled',
  completed: 'Completed',
};

export function ExpertProfile() {
  const { id = '' } = useParams();
  const { session } = useSession();
  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    if (!session || !id) return;
    const load = async () => {
      try {
        setError(null);
        const [nextExpert, nextDrafts] = await Promise.all([
          fetchExpertDetail(session.token, id),
          fetchDrafts(session.token, { expertId: id }),
        ]);
        setExpert(nextExpert);
        setDrafts(nextDrafts);
      } catch {
        setError('Could not load expert profile');
      }
    };
    void load();
  }, [id, session]);

  const profileEntries = useMemo(() => {
    if (!expert) return [];
    return Object.entries(expert.profileData).slice(0, 4);
  }, [expert]);

  const ping = async () => {
    if (!session || !id) return;
    try {
      setError(null);
      setIsPinging(true);
      await requestExpertPing(session.token, id);
    } catch {
      setError('Could not send reminder');
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <Link
        to="/app/experts"
        className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Experts
      </Link>

      {error ? <div className="card text-red-600">{error}</div> : null}
      {!expert ? (
        <div className="card text-ink-500">Loading expert profile...</div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-serif font-medium tracking-tight text-ink-900">
                {expert.name}
              </h1>
              <p className="text-ink-500 text-lg mt-1">{expert.roleTitle}</p>
              <p className="text-sm text-ink-500 mt-2">
                {expert.email} • {expert.domain}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="btn-secondary" onClick={ping} disabled={isPinging}>
                <Mail className="w-4 h-4 mr-2" />
                {isPinging ? 'Sending...' : 'Request 2 minutes'}
              </button>
              <Link to="/app/drafts/new" className="btn-primary">
                Start new draft
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="card space-y-4">
                <h2 className="text-xl font-serif font-medium">Voice Profile</h2>
                <p className="text-sm text-ink-500">Status: {expert.voiceProfileStatus}</p>
                {profileEntries.length === 0 ? (
                  <p className="text-sm text-ink-500">No profile data yet.</p>
                ) : (
                  profileEntries.map(([key, value]) => (
                    <div key={key}>
                      <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">
                        {key}
                      </h3>
                      <p className="text-ink-800 text-sm">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </p>
                    </div>
                  ))
                )}
              </section>

              <section>
                <h2 className="text-xl font-serif font-medium mb-4">Current Drafts</h2>
                <div className="card p-0 overflow-hidden">
                  <ul className="divide-y divide-ink-100">
                    {drafts.length === 0 ? (
                      <li className="p-4 text-ink-500">No drafts assigned yet.</li>
                    ) : (
                      drafts.map((draft) => (
                        <li key={draft.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-start space-x-3">
                            <FileText className="w-5 h-5 text-ink-400 mt-0.5" />
                            <div>
                              <Link
                                to={`/app/drafts/${draft.id}`}
                                className="font-medium text-ink-900 hover:text-terracotta-600"
                              >
                                {draft.title}
                              </Link>
                              <div className="flex items-center text-sm text-ink-500 mt-1 space-x-2">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Updated {toRelative(draft.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
                          <span className="status-pill status-review">{draft.status}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="card space-y-3">
                <h2 className="text-lg font-serif font-medium">Onboarding</h2>
                <p className="text-sm text-ink-500">
                  Chain status: {onboardingStatusLabel[expert.onboardingStatus]}
                </p>
                <p className="text-sm text-ink-500">
                  Current step: {expert.currentStep ?? 'all steps completed'}
                </p>
                <p className="text-sm text-ink-500">
                  Progress: {expert.onboardingProgress}/5 steps
                </p>
                {expert.lastEventAt ? (
                  <p className="text-sm text-ink-500">
                    Last event: {toRelative(expert.lastEventAt)}
                  </p>
                ) : null}
                {expert.stalledReason ? (
                  <p className="text-sm text-ink-500">Stalled reason: {expert.stalledReason}</p>
                ) : null}
                <p className="text-sm text-ink-500">
                  Public sources: {expert.publicTextUrls.length}
                </p>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
