// PATH: apps/web/src/components/PipelineControls.tsx
// WHAT: Pipeline controls with status-aware action gating
// WHY:  FR-067 — UI must not offer actions outside allowed status flow
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-api.ts

import { FormEvent, useState } from 'react';
import { editorizeText } from '../constants/vocabulary';
import { editorialApi } from '../services/editorial-api';
import type { PipelineEvent } from '../services/editorial-types';

type DraftStatus = 'drafting' | 'factcheck' | 'needs_review' | 'approved' | 'revisions';

interface PipelineControlsProps {
  token: string;
  draftId: string;
  status: DraftStatus;
  onDone(): Promise<void>;
}

export const PipelineControls = ({ token, draftId, status, onDone }: PipelineControlsProps) => {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [message, setMessage] = useState('');
  const [instructions, setInstructions] = useState('');

  const canGenerate = status === 'drafting';
  const canFactcheck = status === 'drafting' || status === 'factcheck';
  const canRevise = status === 'needs_review' || status === 'revisions';

  const run = async (step: 'generate' | 'factcheck' | 'revise', body?: Record<string, unknown>) => {
    setMessage('');
    try {
      const next = await editorialApi.runPipelineStep(token, draftId, step, body, (event) => {
        setEvents((current) => [...current, event]);
      });
      if (next.length === 0) setEvents((current) => [...current, { type: 'done' }]);
      await onDone();
    } catch (caught) {
      setMessage(
        editorizeText(caught instanceof Error ? caught.message : 'Step needs clarification'),
      );
    }
  };

  const submitRevise = async (event: FormEvent) => {
    event.preventDefault();
    if (!canRevise) return;
    await run('revise', { instructions });
  };

  return (
    <section className="card">
      <h3>Pipeline</h3>
      <div className="row">
        <button className="btn-secondary" disabled={!canGenerate} onClick={() => run('generate')}>
          Draft
        </button>
        <button className="btn-secondary" disabled={!canFactcheck} onClick={() => run('factcheck')}>
          Facts to confirm
        </button>
      </div>
      <form onSubmit={submitRevise}>
        <input
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Revision notes"
        />
        <button type="submit" className="btn-secondary" disabled={!canRevise}>
          Revise draft
        </button>
      </form>
      {message ? <p className="status-warning">{message}</p> : null}
      <pre className="events">{events.map((item) => JSON.stringify(item)).join('\n')}</pre>
    </section>
  );
};
