// PATH: apps/web/src/pages/create-draft/StrategyLockSummary.tsx
// WHAT: Shows the locked strategy input snapshot and next-step actions
// WHY:  Makes strategy context explicit before copy-to-topic and draft start flow
// RELEVANT: apps/web/src/pages/CreateDraft.tsx,apps/web/src/services/topics.ts

import type { StrategyInputSnapshot } from '../../services/topics';

interface StrategyLockSummaryProps {
  snapshot: StrategyInputSnapshot;
  isDirty: boolean;
  onResetInputs: () => void;
  onRegeneratePlan: () => void;
  isGenerating: boolean;
}

const formatGeneratedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function StrategyLockSummary(props: StrategyLockSummaryProps) {
  const statusTone = props.isDirty
    ? 'border-amber-200 bg-amber-50 text-amber-900'
    : 'border-emerald-200 bg-emerald-50 text-emerald-900';
  const statusLabel = props.isDirty
    ? 'Locked plan is older than current form inputs.'
    : 'Locked plan matches current form inputs.';

  return (
    <section className={`rounded-2xl border p-4 space-y-4 ${statusTone}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">
            Locked strategy context
          </p>
          <p className="text-sm">{statusLabel}</p>
          <p className="text-xs opacity-80">
            Generated {formatGeneratedAt(props.snapshot.generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={props.onResetInputs} className="btn-secondary">
            Reset inputs
          </button>
          <button
            type="button"
            onClick={props.onRegeneratePlan}
            disabled={props.isGenerating}
            className="btn-secondary"
          >
            {props.isGenerating ? 'Generating...' : 'Regenerate plan'}
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="font-semibold">Expert</dt>
          <dd>{props.snapshot.expert.name}</dd>
        </div>
        <div>
          <dt className="font-semibold">Topic seed</dt>
          <dd>{props.snapshot.topicSeed}</dd>
        </div>
        <div>
          <dt className="font-semibold">Audience</dt>
          <dd>{props.snapshot.audience}</dd>
        </div>
        <div>
          <dt className="font-semibold">Market</dt>
          <dd>{props.snapshot.market}</dd>
        </div>
        <div>
          <dt className="font-semibold">Tone</dt>
          <dd>{props.snapshot.constraints.tone}</dd>
        </div>
        <div>
          <dt className="font-semibold">Max items/week</dt>
          <dd>{props.snapshot.constraints.maxItemsPerWeek}</dd>
        </div>
      </dl>
    </section>
  );
}
