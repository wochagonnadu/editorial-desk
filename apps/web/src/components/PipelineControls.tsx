// PATH: apps/web/src/components/PipelineControls.tsx
// WHAT: Sequential pipeline controls for generate/factcheck/revise
// WHY:  Implements idempotent retry-friendly orchestration in UI
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-api.ts

import { FormEvent, useState } from 'react';
import { editorialApi } from '../services/editorial-api';
import type { PipelineEvent } from '../services/editorial-types';

interface PipelineControlsProps {
  token: string;
  draftId: string;
  onDone(): Promise<void>;
}

export const PipelineControls = ({ token, draftId, onDone }: PipelineControlsProps) => {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [error, setError] = useState('');
  const [instructions, setInstructions] = useState('');

  const run = async (step: 'generate' | 'factcheck' | 'revise', body?: Record<string, unknown>) => {
    setError('');
    try {
      const next = await editorialApi.runPipelineStep(token, draftId, step, body, (event) => {
        setEvents((current) => [...current, event]);
      });
      if (next.length === 0) setEvents((current) => [...current, { type: 'done' }]);
      await onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pipeline step failed');
    }
  };

  const submitRevise = async (event: FormEvent) => {
    event.preventDefault();
    await run('revise', { instructions });
  };

  return (
    <section className="card">
      <h3>Pipeline</h3>
      <div className="row">
        <button onClick={() => run('generate')}>Generate</button>
        <button onClick={() => run('factcheck')}>Factcheck</button>
      </div>
      <form onSubmit={submitRevise}>
        <input
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Revision instructions"
        />
        <button type="submit">Revise</button>
      </form>
      {error ? (
        <p className="status-warning">
          {error} <button onClick={() => run('generate')}>Retry</button>
        </p>
      ) : null}
      <pre className="events">{events.map((item) => JSON.stringify(item)).join('\n')}</pre>
    </section>
  );
};
