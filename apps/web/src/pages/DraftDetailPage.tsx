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
import { Skeleton } from '../components/ui/Skeleton';
import { type DraftStatus } from '../components/ui/StatusPill';
import { editorialApi } from '../services/editorial-api';
import { DraftEditorHeader } from './draft-detail/DraftEditorHeader';
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
  if (!editor.token || !editor.data.draft) return <Skeleton variant="list" />;
  const token = editor.token;
  const canSendForApproval = editor.factcheckReady && editor.data.draft.status === 'factcheck';
  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <DraftEditorHeader
        title={editor.data.draft.topic?.title ?? 'Draft'}
        status={editor.data.draft.status as DraftStatus}
        versions={editor.data.versions}
        selectedVersionId={editor.selectedVersionId}
        onSelectVersion={editor.setSelectedVersionId}
        nextReviewer={nextStep?.approver?.name ?? 'Pending'}
        canSendForApproval={canSendForApproval}
        onSaveVersion={editor.saveVersion}
        onSendForApproval={editor.sendForApproval}
      />
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
          <PipelineControls
            token={token}
            draftId={id}
            status={editor.data.draft.status as DraftStatus}
            onDone={editor.load}
          />
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
