// PATH: apps/web/src/pages/settings/GenerationControlsCard.tsx
// WHAT: Settings card for workspace generation policy and preview action
// WHY:  Lets owners set tone/guardrails once and verify output before saving
// RELEVANT: apps/web/src/pages/Settings.tsx,apps/web/src/pages/settings/GenerationPreviewPanel.tsx

import type { ExpertItem } from '../../services/experts';
import type { GenerationPolicy } from '../../services/company';
import { GenerationPreviewPanel } from './GenerationPreviewPanel';

type GuardrailField = 'must_include' | 'avoid' | 'banned_phrases';

type Props = {
  value: GenerationPolicy;
  saving: boolean;
  previewing: boolean;
  experts: ExpertItem[];
  previewExpertId: string;
  previewTopicTitle: string;
  previewInstructions: string;
  previewSample: string | null;
  previewError: string | null;
  onToneChange: (value: string) => void;
  onAudienceChange: (value: GenerationPolicy['default_audience']) => void;
  onGuardrailTextChange: (field: GuardrailField, value: string) => void;
  onPreviewFieldChange: (
    field: 'expert_id' | 'topic_title' | 'instructions',
    value: string,
  ) => void;
  onPreview: () => void;
};

const joinLines = (items: string[]) => items.join('\n');

export function GenerationControlsCard(props: Props) {
  const disabled = props.saving;
  return (
    <section className="card space-y-4">
      <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
        Generation Controls
      </h2>
      <label className="space-y-1 block text-sm">
        <span className="text-ink-500">Editorial tone</span>
        <textarea
          value={props.value.tone}
          onChange={(e) => props.onToneChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white min-h-20"
        />
      </label>
      <label className="space-y-1 block text-sm">
        <span className="text-ink-500">Default audience</span>
        <select
          value={props.value.default_audience}
          onChange={(e) =>
            props.onAudienceChange(e.target.value as GenerationPolicy['default_audience'])
          }
          disabled={disabled}
          className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
        >
          <option value="general">general</option>
          <option value="beginners">beginners</option>
          <option value="practitioners">practitioners</option>
        </select>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-ink-500">Must include (one per line)</span>
          <textarea
            value={joinLines(props.value.guardrails.must_include)}
            onChange={(e) => props.onGuardrailTextChange('must_include', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white min-h-24"
          />
        </label>
        <label className="space-y-1">
          <span className="text-ink-500">Avoid (one per line)</span>
          <textarea
            value={joinLines(props.value.guardrails.avoid)}
            onChange={(e) => props.onGuardrailTextChange('avoid', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white min-h-24"
          />
        </label>
        <label className="space-y-1">
          <span className="text-ink-500">Banned phrases (one per line)</span>
          <textarea
            value={joinLines(props.value.guardrails.banned_phrases)}
            onChange={(e) => props.onGuardrailTextChange('banned_phrases', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white min-h-24"
          />
        </label>
      </div>
      <GenerationPreviewPanel
        previewing={props.previewing}
        experts={props.experts}
        previewExpertId={props.previewExpertId}
        previewTopicTitle={props.previewTopicTitle}
        previewInstructions={props.previewInstructions}
        previewSample={props.previewSample}
        previewError={props.previewError}
        onPreviewFieldChange={props.onPreviewFieldChange}
        onPreview={props.onPreview}
      />
    </section>
  );
}
