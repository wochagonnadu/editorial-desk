// PATH: apps/web/src/pages/create-draft/SuggestedTopicsList.tsx
// WHAT: Renders suggestion cards with save-to-topics actions
// WHY:  Reuses the existing generated-card pattern for the explicit suggest flow
// RELEVANT: apps/web/src/pages/SuggestTopics.tsx,apps/web/src/services/topics.ts

import type { SuggestedTopicItem } from '../../services/topics';

interface SuggestedTopicsListProps {
  items: SuggestedTopicItem[];
  savingTitle: string | null;
  savedTitles: Set<string>;
  onSave: (item: SuggestedTopicItem) => Promise<void> | void;
}

export function SuggestedTopicsList(props: SuggestedTopicsListProps) {
  return (
    <div className="space-y-4">
      {props.items.map((item) => {
        const isSaving = props.savingTitle === item.title;
        const isSaved = props.savedTitles.has(item.title);
        return (
          <article key={`${item.title}-${item.expertId ?? 'shared'}`} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm space-y-3">
            <header className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-medium text-ink-900">{item.title}</h3>
                <span className="status-pill status-drafting">{item.sourceType}</span>
              </div>
              <p className="text-xs text-ink-500">
                {item.expertName ? `Expert: ${item.expertName}` : 'Suggested for the workspace'}
              </p>
            </header>
            <p className="text-sm leading-6 text-ink-600">{item.description}</p>
            <button
              type="button"
              disabled={isSaving || isSaved}
              onClick={() => props.onSave(item)}
              className="btn-secondary"
            >
              {isSaved ? 'Saved to topics' : isSaving ? 'Saving...' : 'Save to topics'}
            </button>
          </article>
        );
      })}
    </div>
  );
}
