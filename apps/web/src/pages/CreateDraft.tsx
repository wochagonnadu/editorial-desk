// PATH: apps/web/src/pages/CreateDraft.tsx
// WHAT: Topic-to-draft workflow page using topics and drafts API endpoints
// WHY:  Replaces demo strategy timeout with real create/approve/create-draft flow
// RELEVANT: apps/web/src/services/topics.ts,apps/web/src/services/drafts.ts

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createDraftFromTopic } from '../services/drafts';
import { fetchExperts } from '../services/experts';
import {
  approveTopic,
  createTopic,
  fetchTopics,
  generateStrategyPlan,
  type StrategyCopyPayload,
  type StrategyPlan,
  type TopicItem,
} from '../services/topics';
import { useSession } from '../services/session';
import { StrategyPlanView } from './create-draft/StrategyPlanView';

export function CreateDraft() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [strategyPlan, setStrategyPlan] = useState<StrategyPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [copyingItemId, setCopyingItemId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [newTopicError, setNewTopicError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

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
        setPageError(null);
        const [experts] = await Promise.all([fetchExperts(session.token), loadTopics()]);
        setExpertOptions(
          experts.map((item) => ({ id: item.id, name: item.name, status: item.status })),
        );
      } catch {
        setPageError('Could not load create-draft context');
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
      setNewTopicError(null);
      setPageError(null);
      setIsBusy(true);
      const topicId = await createTopic(session.token, {
        title: topicTitle.trim(),
        expertId: selectedExpertId,
      });
      await approveTopic(session.token, topicId);
      const draftId = await createDraftFromTopic(session.token, topicId);
      navigate(`/app/drafts/${draftId}`);
    } catch {
      setNewTopicError('Could not create draft from topic');
    } finally {
      setIsBusy(false);
    }
  };

  const startFromExistingTopic = async (topicId: string, status: string) => {
    if (!session) return;
    try {
      setNewTopicError(null);
      setPageError(null);
      setIsBusy(true);
      if (status !== 'approved') {
        await approveTopic(session.token, topicId);
      }
      const draftId = await createDraftFromTopic(session.token, topicId);
      navigate(`/app/drafts/${draftId}`);
    } catch {
      setNewTopicError('Could not start draft from selected topic');
    } finally {
      setIsBusy(false);
    }
  };

  const generateContentPlan = async () => {
    if (!session || !selectedExpertId || topicTitle.trim().length < 3) return;
    const expert = expertOptions.find((item) => item.id === selectedExpertId);
    try {
      setPlanError(null);
      setPageError(null);
      setIsGeneratingPlan(true);
      const plan = await generateStrategyPlan(session.token, {
        expertId: selectedExpertId,
        topicSeed: topicTitle.trim(),
        audience: 'general',
        market: 'en-US',
        constraints: { tone: 'practical and calm', maxItemsPerWeek: 2 },
      });
      setStrategyPlan(plan);
      if (!expert) setPlanError('Plan generated, but selected expert context is incomplete');
    } catch {
      setPlanError('Could not generate structured content plan');
      setStrategyPlan(null);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const copyPlanItem = async (itemId: string, payload: StrategyCopyPayload) => {
    if (!session) return;
    try {
      setCopyError(null);
      setPageError(null);
      setCopyingItemId(itemId);
      await createTopic(session.token, {
        title: payload.title,
        expertId: payload.expert_id ?? selectedExpertId,
        description: payload.description,
        sourceType: payload.source_type,
      });
      await loadTopics();
    } catch {
      setCopyError('Could not copy strategy item to topics');
    } finally {
      setCopyingItemId(null);
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

      {pageError ? <div className="card text-red-600">{pageError}</div> : null}

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
        {newTopicError ? <p className="text-sm text-red-600">{newTopicError}</p> : null}
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-serif font-medium">Strategy Builder</h2>
          <button
            type="button"
            onClick={generateContentPlan}
            disabled={isGeneratingPlan || !selectedExpertId || topicTitle.trim().length < 3}
            className="btn-secondary"
          >
            {isGeneratingPlan ? 'Generating...' : 'Generate Content Plan'}
          </button>
        </div>
        <p className="text-sm text-ink-500">
          Generate a structured 12-week plan with pillars, clusters, FAQ, and interlink hints.
        </p>
        {planError ? <p className="text-sm text-red-600">{planError}</p> : null}
        {strategyPlan ? (
          <StrategyPlanView
            plan={strategyPlan}
            isCopying={copyingItemId !== null}
            copyingItemId={copyingItemId}
            onCopyCluster={copyPlanItem}
            onCopyFaq={copyPlanItem}
          />
        ) : (
          <p className="text-sm text-ink-400">
            Select expert + topic seed, then click Generate Content Plan.
          </p>
        )}
        {copyError ? <p className="text-sm text-red-600">{copyError}</p> : null}
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
        {newTopicError ? <p className="text-sm text-red-600">{newTopicError}</p> : null}
      </section>
    </div>
  );
}
