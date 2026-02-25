// PATH: apps/web/src/pages/draft-detail/DraftEditorHeader.tsx
// WHAT: Header block for DraftDetailPage (status, version selector, CTA)
// WHY:  Keeps DraftDetailPage under 100 LOC and easier to reason about
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/components/editor/VersionSelector.tsx

import { VersionSelector } from '../../components/editor/VersionSelector';
import { StatusPill, type DraftStatus } from '../../components/ui/StatusPill';
import type { DraftVersionItem } from '../../services/editorial-types';

interface DraftEditorHeaderProps {
  title: string;
  status: DraftStatus;
  versions: DraftVersionItem[];
  selectedVersionId?: string;
  onSelectVersion: (id: string) => void;
  nextReviewer: string;
  canSendForApproval: boolean;
  onSaveVersion: () => void;
  onSendForApproval: () => void;
}

export function DraftEditorHeader(props: DraftEditorHeaderProps) {
  return (
    <header className="card" style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <h2>{props.title}</h2>
      <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusPill status={props.status} />
        <VersionSelector
          versions={props.versions}
          currentVersionId={props.selectedVersionId}
          onSelect={props.onSelectVersion}
        />
        <span>Next reviewer: {props.nextReviewer}</span>
        <button className="btn-secondary" onClick={props.onSaveVersion}>
          Save version
        </button>
        <button
          className="btn-primary"
          disabled={!props.canSendForApproval}
          onClick={props.onSendForApproval}
        >
          Send for approval
        </button>
      </div>
      {!props.canSendForApproval ? (
        <small>Factcheck must be ready and status should be Factcheck.</small>
      ) : null}
    </header>
  );
}
