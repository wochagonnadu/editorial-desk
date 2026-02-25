// PATH: apps/web/src/components/ApprovalConfig.tsx
// WHAT: Form to configure and trigger draft approval workflow
// WHY:  Lets manager define sequential/parallel reviewers before send
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-api.ts

import { FormEvent, useState } from 'react';
import { editorizeText } from '../constants/vocabulary';
import { editorialApi } from '../services/editorial-api';
import type { ApprovalConfigPayload } from '../services/editorial-types';

interface ApprovalConfigProps {
  token: string;
  draftId: string;
  onDone(): Promise<void>;
}

const emptyStep = (): ApprovalConfigPayload['steps'][number] => ({
  approver_type: 'user',
  approver_id: '',
});

export const ApprovalConfig = ({ token, draftId, onDone }: ApprovalConfigProps) => {
  const [flowType, setFlowType] = useState<'sequential' | 'parallel'>('sequential');
  const [deadlineHours, setDeadlineHours] = useState('48');
  const [steps, setSteps] = useState<ApprovalConfigPayload['steps']>([emptyStep()]);
  const [message, setMessage] = useState('');

  const updateStep = (index: number, next: Partial<ApprovalConfigPayload['steps'][number]>) => {
    setSteps((items) => items.map((item, idx) => (idx === index ? { ...item, ...next } : item)));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const payload: ApprovalConfigPayload = {
      flow_type: flowType,
      deadline_hours: Number(deadlineHours) > 0 ? Number(deadlineHours) : 48,
      steps: steps
        .filter((step) => step.approver_id.trim())
        .map((step) => ({ ...step, approver_id: step.approver_id.trim() })),
    };
    if (payload.steps.length === 0) return setMessage('Add at least one reviewer');
    await editorialApi.sendForReview(token, draftId, payload);
    await onDone();
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>Approval config</h3>
      <div className="row">
        <label>Flow</label>
        <select
          value={flowType}
          onChange={(e) => setFlowType(e.target.value as 'sequential' | 'parallel')}
        >
          <option value="sequential">Sequential</option>
          <option value="parallel">Parallel</option>
        </select>
      </div>
      <div className="row">
        <label>Deadline (hours)</label>
        <input value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} />
      </div>
      {steps.map((step, index) => (
        <div className="row" key={`${index}-${step.approver_id}`}>
          <select
            value={step.approver_type}
            onChange={(e) =>
              updateStep(index, { approver_type: e.target.value as 'user' | 'expert' })
            }
          >
            <option value="user">User</option>
            <option value="expert">Expert</option>
          </select>
          <input
            value={step.approver_id}
            placeholder="Approver ID"
            onChange={(e) => updateStep(index, { approver_id: e.target.value })}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSteps((items) => items.filter((_, idx) => idx !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="row">
        <button
          className="btn-secondary"
          type="button"
          onClick={() => setSteps((items) => [...items, emptyStep()])}
        >
          Add step
        </button>
        <button className="btn-primary" type="submit">
          Send for review
        </button>
      </div>
      {message ? <p className="status-warning">{editorizeText(message)}</p> : null}
    </form>
  );
};
