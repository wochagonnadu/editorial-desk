// PATH: apps/web/src/pages/DraftDetailPage.tsx
// WHAT: Draft Editor page with header controls and right-side review panels
// WHY:  US2 — менеджер редактирует, проверяет и отправляет драфт на ревью
// RELEVANT: apps/web/src/pages/draft-detail/useDraftDetailEditor.ts,apps/web/src/components/editor/RichTextEditor.tsx

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApprovalStatus } from '../components/ApprovalStatus';
import { PipelineControls } from '../components/PipelineControls';
import { VersionDiff } from '../components/VersionDiff';
import { AuditTrailPanel } from '../components/editor/AuditTrailPanel';
import { FactcheckPanel } from '../components/editor/FactcheckPanel';
import { InlineComment } from '../components/editor/InlineComment';
import { RichTextEditor } from '../components/editor/RichTextEditor';
import { VersionSelector } from '../components/editor/VersionSelector';
import { StatusPill, type DraftStatus } from '../components/ui/StatusPill';
import { editorialApi } from '../services/editorial-api';
import { useDraftDetailEditor } from './draft-detail/useDraftDetailEditor';

export const DraftDetailPage = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const requestedReviewVersion = Number(params.get('review_version') ?? '0');
  const editor = useDraftDetailEditor(id, requestedReviewVersion);
  const nextStep = useMemo(
    () =>
      editor.data.draft?.approval?.steps.find(
        (step) => step.status === 'pending' || step.status === 'waiting',
      ),
    [editor.data.draft],
  );
  if (!editor.token || !editor.data.draft) return <p>Loading draft...</p>;
  const token = editor.token;
  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <header className="card" style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <h2>{editor.data.draft.topic?.title ?? 'Draft'}</h2>
        <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusPill status={editor.data.draft.status as DraftStatus} />
          <VersionSelector
            versions={editor.data.versions}
            currentVersionId={editor.selectedVersionId}
            onSelect={editor.setSelectedVersionId}
          />
          <span>Next reviewer: {nextStep?.approver?.name ?? 'Pending'}</span>
          <button className="btn-secondary" onClick={editor.saveVersion}>
            Save version
          </button>
          <button
            className="btn-primary"
            disabled={!editor.factcheckReady}
            onClick={editor.sendForApproval}
          >
            Send for approval
          </button>
        </div>
        {!editor.factcheckReady ? <small>Factcheck needs confirmation before review.</small> : null}
      </header>
      {editor.staleWarning ? (
        <p className="status-warning">You are reviewing an older version.</p>
      ) : null}
      {editor.note ? <p>{editor.note}</p> : null}
      <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: '2fr 1fr' }}>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <RichTextEditor content={editor.editorContent} onChange={editor.setEditorContent} />
          <InlineComment
            content={editor.editorContent}
            onSubmit={async (payload) => {
              await editorialApi.addComment(token, id, payload);
              await editor.load();
            }}
          />
          <PipelineControls token={token} draftId={id} onDone={editor.load} />
        </div>
        <aside style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <div className="row">
            <button className="btn-secondary" onClick={() => editor.setTab('factcheck')}>
              Factcheck
            </button>
            <button className="btn-secondary" onClick={() => editor.setTab('changes')}>
              Changes
            </button>
            <button className="btn-secondary" onClick={() => editor.setTab('audit')}>
              Audit
            </button>
          </div>
          {editor.tab === 'factcheck' ? (
            <FactcheckPanel report={editor.data.draft.factcheck_report ?? undefined} />
          ) : null}
          {editor.tab === 'changes' ? <VersionDiff versions={editor.data.versions} /> : null}
          {editor.tab === 'audit' ? <AuditTrailPanel entries={editor.data.audit} /> : null}
          <ApprovalStatus approval={editor.data.draft.approval} />
        </aside>
      </div>
    </section>
  );
};
