// PATH: apps/web/src/pages/DraftDetailPage.tsx
// WHAT: Draft Editor page with header controls and right-side review panels
// WHY:  US2 — менеджер редактирует, проверяет и отправляет драфт на ревью
// RELEVANT: apps/web/src/pages/draft-detail/useDraftDetailEditor.ts,apps/web/src/components/editor/RichTextEditor.tsx

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PipelineControls } from '../components/PipelineControls';
import { InlineComment } from '../components/editor/InlineComment';
import { RichTextEditor } from '../components/editor/RichTextEditor';
import { Skeleton } from '../components/ui/Skeleton';
import { type DraftStatus } from '../components/ui/StatusPill';
import { editorialApi } from '../services/editorial-api';
import { DraftEditorHeader } from './draft-detail/DraftEditorHeader';
import { DraftEditorSidebar } from './draft-detail/DraftEditorSidebar';
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
    <section className="draft-editor-page">
      <DraftEditorHeader
        title={editor.data.draft.topic?.title ?? 'Draft'}
        status={editor.data.draft.status as DraftStatus}
        expertName={editor.data.draft.expert?.name}
        versions={editor.data.versions}
        selectedVersionId={editor.selectedVersionId}
        onSelectVersion={editor.setSelectedVersionId}
        nextReviewer={nextStep?.approver?.name ?? 'Pending'}
        canSendForApproval={canSendForApproval}
        onSaveVersion={editor.saveVersion}
        onSendForApproval={editor.sendForApproval}
      />

      {editor.staleWarning ? (
        <p className="draft-editor-note draft-editor-note--warning">
          You are reviewing an older version. Switch to the latest version before publishing.
        </p>
      ) : null}

      {editor.note ? <p className="draft-editor-note">{editor.note}</p> : null}

      <div className="draft-editor-layout">
        <div className="draft-editor-main">
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

        <DraftEditorSidebar
          tab={editor.tab}
          setTab={editor.setTab}
          factcheckReport={editor.data.draft.factcheck_report}
          versions={editor.data.versions}
          auditEntries={editor.data.audit}
          approval={editor.data.draft.approval}
        />
      </div>
    </section>
  );
};
