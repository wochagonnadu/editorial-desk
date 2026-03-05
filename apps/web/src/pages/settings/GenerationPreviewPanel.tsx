// PATH: apps/web/src/pages/settings/GenerationPreviewPanel.tsx
// WHAT: Preview inputs and result panel for generation policy checks
// WHY:  Keeps generation preview UX reusable and separate from policy form
// RELEVANT: apps/web/src/pages/settings/GenerationControlsCard.tsx,apps/web/src/services/company.ts

import type { ExpertItem } from '../../services/experts';

type Props = {
  previewing: boolean;
  experts: ExpertItem[];
  previewExpertId: string;
  previewTopicTitle: string;
  previewInstructions: string;
  previewSample: string | null;
  previewError: string | null;
  onPreviewFieldChange: (
    field: 'expert_id' | 'topic_title' | 'instructions',
    value: string,
  ) => void;
  onPreview: () => void;
};

export function GenerationPreviewPanel(props: Props) {
  return (
    <div className="border-t border-ink-100 pt-4 space-y-3">
      <h3 className="font-medium">Preview</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={props.previewExpertId}
          onChange={(e) => props.onPreviewFieldChange('expert_id', e.target.value)}
          className="px-3 py-2 rounded-xl border border-ink-100 bg-white"
          disabled={props.previewing || props.experts.length === 0}
        >
          <option value="">Select expert</option>
          {props.experts.map((expert) => (
            <option key={expert.id} value={expert.id}>
              {expert.name}
            </option>
          ))}
        </select>
        <input
          value={props.previewTopicTitle}
          onChange={(e) => props.onPreviewFieldChange('topic_title', e.target.value)}
          placeholder="Preview topic"
          className="px-3 py-2 rounded-xl border border-ink-100 bg-white"
          disabled={props.previewing}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={props.onPreview}
          disabled={props.previewing || !props.previewExpertId || !props.previewTopicTitle.trim()}
        >
          {props.previewing ? 'Generating...' : 'Generate preview'}
        </button>
      </div>
      <textarea
        value={props.previewInstructions}
        onChange={(e) => props.onPreviewFieldChange('instructions', e.target.value)}
        placeholder="Optional revise instructions"
        className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white min-h-16"
        disabled={props.previewing}
      />
      {props.previewError ? <p className="text-sm text-red-600">{props.previewError}</p> : null}
      {props.previewSample ? (
        <pre className="text-sm bg-beige-50 border border-ink-100 rounded-xl p-3 whitespace-pre-wrap">
          {props.previewSample}
        </pre>
      ) : null}
    </div>
  );
}
