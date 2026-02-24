// PATH: apps/web/src/components/ApprovalStatus.tsx
// WHAT: Visual step tracker for active/completed approval workflows
// WHY:  Gives draft page transparent review status and deadlines
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-types.ts

import type { ApprovalStatusData } from '../services/editorial-types';

interface ApprovalStatusProps {
  approval?: ApprovalStatusData | null;
}

const formatDeadline = (deadline: string | null | undefined) => {
  if (!deadline) return 'No deadline';
  const msLeft = new Date(deadline).getTime() - Date.now();
  if (msLeft <= 0) return 'Overdue';
  return `${Math.ceil(msLeft / 3600_000)}h left`;
};

export const ApprovalStatus = ({ approval }: ApprovalStatusProps) => {
  if (!approval) return <article className="card"><h3>Approval</h3><p>Not started yet.</p></article>;

  return (
    <article className="card">
      <h3>Approval</h3>
      <p>Flow: {approval.flow_type} | Status: {approval.status}</p>
      {approval.steps.length === 0 ? <p>No steps configured.</p> : null}
      {approval.steps.map((step) => (
        <div className="approval-step" key={`${step.step_order}-${step.approver?.email ?? 'unknown'}`}>
          <strong>Step {step.step_order}</strong> - {step.approver?.name ?? 'Unknown'} ({step.status})
          <div>{formatDeadline(step.deadline_at ?? null)}</div>
        </div>
      ))}
    </article>
  );
};
