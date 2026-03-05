// PATH: apps/web/src/pages/CreateDraft.tsx
// WHAT: Topic-to-draft workflow page using topics and drafts API endpoints
// WHY:  Replaces demo strategy timeout with real create/approve/create-draft flow
// RELEVANT: apps/web/src/services/topics.ts,apps/web/src/services/drafts.ts

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createDraftFromTopic, generateDraftContent } from '../services/drafts';
import { fetchExperts } from '../services/experts';
import { approveTopic, createTopic, fetchTopics, type TopicItem } from '../services/topics';
import { useSession } from '../services/session';

export function CreateDraft() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTopics = async () => {
    if (!session) return;
    setTopics(await fetchTopics(session.token));
  };

  const [expertOptions, setExpertOptions] = useState<
    Array<{ id: string; name: string; status: string }>
  >([]);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        setError(null);
        const [experts] = await Promise.all([fetchExperts(session.token), loadTopics()]);
        setExpertOptions(
          experts.map((item) => ({ id: item.id, name: item.name, status: item.status })),
        );
      } catch {
        setError('Could not load create-draft context');
      }
    };
    void load();
  }, [session]);

  const activeExperts = useMemo(
    () => expertOptions.filter((item) => item.status === 'active'),
    [expertOptions],
  );

  const startFromNewTopic = async () => {
    if (!session || !selectedExpertId || topicTitle.trim().length < 3) return;
    try {
      setError(null);
      setIsBusy(true);
      const topicId = await createTopic(session.token, {
        title: topicTitle.trim(),
        expertId: selectedExpertId,
      });
      await approveTopic(session.token, topicId);
      const draftId = await createDraftFromTopic(session.token, topicId);
      await generateDraftContent(session.token, draftId);
      navigate(`/app/drafts/${draftId}`);
    } catch {
      setError('Could not create draft from topic');
    } finally {
      setIsBusy(false);
    }
  };

  const startFromExistingTopic = async (topicId: string, status: string) => {
    if (!session) return;
    try {
      setError(null);
      setIsBusy(true);
      if (status !== 'approved') {
        await approveTopic(session.token, topicId);
      }
      const draftId = await createDraftFromTopic(session.token, topicId);
      await generateDraftContent(session.token, draftId);
      navigate(`/app/drafts/${draftId}`);
    } catch {
      setError('Could not start draft from selected topic');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <Link
        to="/app/drafts"
        className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Drafts
      </Link>

      <header>
        <h1 className="text-4xl font-serif font-medium tracking-tight text-ink-900">
          Create Draft
        </h1>
        <p className="text-ink-500 text-lg mt-1">
          Create topic, approve it, then open real draft editor.
        </p>
      </header>

      {error ? <div className="card text-red-600">{error}</div> : null}

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium">New topic flow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={selectedExpertId}
            onChange={(event) => setSelectedExpertId(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white"
          >
            <option value="">Select active expert</option>
            {activeExperts.map((expert) => (
              <option key={expert.id} value={expert.id}>
                {expert.name}
              </option>
            ))}
          </select>
          <input
            value={topicTitle}
            onChange={(event) => setTopicTitle(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-ink-200"
            placeholder="Topic title (min 3 chars)"
          />
        </div>
        <button
          type="button"
          onClick={startFromNewTopic}
          disabled={isBusy || !selectedExpertId || topicTitle.trim().length < 3}
          className="btn-primary"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isBusy ? 'Working...' : 'Create and open draft'}
        </button>
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium">Existing topics</h2>
        {topics.length === 0 ? (
          <p className="text-sm text-ink-500">No topics yet.</p>
        ) : (
          <div className="space-y-3">
            {topics.slice(0, 12).map((topic) => (
              <div
                key={topic.id}
                className="border border-ink-100 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-ink-900">{topic.title}</p>
                  <p className="text-xs text-ink-500 mt-1">
                    {topic.expertName ?? 'No expert'} • {topic.status}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isBusy || !topic.expertId}
                  onClick={() => startFromExistingTopic(topic.id, topic.status)}
                  className="btn-secondary"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Start draft
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
