// PATH: apps/web/src/pages/draft-detail/DraftEditorHeader.tsx
// WHAT: Header block for DraftDetailPage (status, version selector, CTA)
// WHY:  Keeps DraftDetailPage under 100 LOC and easier to reason about
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/components/editor/VersionSelector.tsx

import { Link } from 'react-router-dom';
import { VersionSelector } from '../../components/editor/VersionSelector';
import { StatusPill, type DraftStatus } from '../../components/ui/StatusPill';
import type { DraftVersionItem } from '../../services/editorial-types';

interface DraftEditorHeaderProps {
  title: string;
  status: DraftStatus;
  expertName?: string;
  versions: DraftVersionItem[];
  selectedVersionId?: string;
  onSelectVersion: (id: string) => void;
  nextReviewer: string;
  canSendForApproval: boolean;
  onSaveVersion: () => void;
  onSendForApproval: () => void;
}

export function DraftEditorHeader(props: DraftEditorHeaderProps) {
  const selectedVersion = props.versions.find((item) => item.id === props.selectedVersionId);
  const versionNumber =
    selectedVersion?.versionNumber ??
    selectedVersion?.version_number ??
    props.versions[0]?.versionNumber;

  return (
    <header className="draft-editor-header card">
      <div className="draft-editor-header-top">
        <Link to="/drafts" className="btn-secondary">
          Back to drafts
        </Link>
        <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
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
      </div>

      <div>
        <h2 style={{ marginBottom: 'var(--space-1)' }}>{props.title}</h2>
        <div className="draft-editor-meta">
          <StatusPill status={props.status} />
          <span>v{versionNumber ?? '?'}</span>
          <span>{props.expertName ? `Expert: ${props.expertName}` : 'Expert pending'}</span>
          <span>Next reviewer: {props.nextReviewer}</span>
        </div>
      </div>

      <div className="draft-editor-header-controls">
        <VersionSelector
          versions={props.versions}
          currentVersionId={props.selectedVersionId}
          onSelect={props.onSelectVersion}
        />
      </div>

      {!props.canSendForApproval ? (
        <small className="draft-editor-hint">
          Factcheck must be completed and draft status should be Factcheck.
        </small>
      ) : null}
    </header>
  );
}
