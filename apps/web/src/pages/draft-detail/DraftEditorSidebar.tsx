// PATH: apps/web/src/pages/draft-detail/DraftEditorSidebar.tsx
// WHAT: Right sidebar for DraftDetailPage with tabs and review panels
// WHY:  Keeps page lean and isolates factcheck/changes/audit switching
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/components/editor/FactcheckPanel.tsx

import { ApprovalStatus } from '../../components/ApprovalStatus';
import { VersionDiff } from '../../components/VersionDiff';
import { AuditTrailPanel } from '../../components/editor/AuditTrailPanel';
import { FactcheckPanel } from '../../components/editor/FactcheckPanel';
import type {
  ApprovalStatusData,
  AuditEntry,
  DraftVersionItem,
} from '../../services/editorial-types';
import type { SideTab } from './useDraftDetailEditor';

interface DraftEditorSidebarProps {
  tab: SideTab;
  setTab: (tab: SideTab) => void;
  factcheckReport?: { status?: string; results?: Array<Record<string, unknown>> } | null;
  versions: DraftVersionItem[];
  auditEntries: AuditEntry[];
  approval?: ApprovalStatusData | null;
}

export function DraftEditorSidebar(props: DraftEditorSidebarProps) {
  return (
    <aside className="draft-editor-sidebar">
      <div className="draft-editor-tabs">
        <button
          className={props.tab === 'factcheck' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => props.setTab('factcheck')}
        >
          Factcheck
        </button>
        <button
          className={props.tab === 'changes' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => props.setTab('changes')}
        >
          Changes
        </button>
        <button
          className={props.tab === 'audit' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => props.setTab('audit')}
        >
          Audit
        </button>
      </div>

      {props.tab === 'factcheck' ? (
        <FactcheckPanel report={props.factcheckReport ?? undefined} />
      ) : null}
      {props.tab === 'changes' ? <VersionDiff versions={props.versions} /> : null}
      {props.tab === 'audit' ? <AuditTrailPanel entries={props.auditEntries} /> : null}
      <ApprovalStatus approval={props.approval} />
    </aside>
  );
}
