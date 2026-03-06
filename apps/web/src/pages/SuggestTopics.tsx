// PATH: apps/web/src/pages/SuggestTopics.tsx
// WHAT: Explicit web flow for loading and saving suggested topics
// WHY:  Makes topics.suggest visible in the app without rebuilding the draft-start UX
// RELEVANT: apps/web/src/services/topics.ts,apps/web/src/services/experts.ts

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchExperts } from '../services/experts';
import { createTopic, suggestTopics, type SuggestedTopicItem } from '../services/topics';
import { useSession } from '../services/session';
import { SuggestedTopicsList } from './create-draft/SuggestedTopicsList';

export function SuggestTopics() {
  const { session } = useSession();
  const [suggestions, setSuggestions] = useState<SuggestedTopicItem[]>([]);
  const [savingTitle, setSavingTitle] = useState<string | null>(null);
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeExpertCount, setActiveExpertCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        setLoadError(null);
        const experts = await fetchExperts(session.token);
        setActiveExpertCount(experts.filter((item) => item.status === 'active').length);
      } catch {
        setActiveExpertCount(0);
      }
    };
    void load();
  }, [session]);

  const loadSuggestions = async () => {
    if (!session) return;
    try {
      setLoadError(null);
      setSaveError(null);
      setIsLoading(true);
      setSuggestions(await suggestTopics(session.token));
    } catch {
      setLoadError('Could not load topic suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSuggestion = async (item: SuggestedTopicItem) => {
    if (!session) return;
    try {
      setSaveError(null);
      setSavingTitle(item.title);
      await createTopic(session.token, item.savePayload);
      setSavedTitles((current) => new Set([...current, item.title]));
    } catch {
      setSaveError('Could not save suggested topic');
    } finally {
      setSavingTitle(null);
    }
  };

  const helperText = useMemo(() => {
    if (activeExpertCount > 0) return `Suggestions use all ${activeExpertCount} active experts in the workspace.`;
    return 'Suggestions use the current workspace context and available experts.';
  }, [activeExpertCount]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <Link to="/app/drafts" className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Drafts
      </Link>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-serif font-medium tracking-tight text-ink-900">Suggest Topics</h1>
          <p className="text-ink-500 text-lg mt-1">Load topic ideas from the current expert roster, then save the ones you want to develop.</p>
          <p className="text-sm text-ink-500 mt-2">{helperText}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadSuggestions} disabled={isLoading} className="btn-primary">
            <Sparkles className="w-4 h-4 mr-2" />
            {isLoading ? 'Loading suggestions...' : 'Suggest topics'}
          </button>
          <Link to="/app/drafts/new" className="btn-secondary">Create draft</Link>
        </div>
      </header>
      {loadError ? <div className="card text-red-600">{loadError}</div> : null}
      {saveError ? <div className="card text-red-600">{saveError}</div> : null}
      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-serif font-medium">Suggested topics</h2>
          <span className="text-sm text-ink-500">{suggestions.length} items</span>
        </div>
        {suggestions.length === 0 ? (
          <p className="text-sm text-ink-500">Click Suggest topics to load a fresh set of ideas for the current workspace.</p>
        ) : (
          <SuggestedTopicsList items={suggestions} savingTitle={savingTitle} savedTitles={savedTitles} onSave={saveSuggestion} />
        )}
      </section>
    </div>
  );
}
