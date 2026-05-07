// PATH: apps/web/src/pages/draft-editor/save-draft-editor-content.ts
// WHAT: Runs draft editor save flow without touching local editor text
// WHY:  Keeps failed saves from overwriting user edits in the draft editor
// RELEVANT: apps/web/src/pages/DraftEditor.tsx,apps/web/src/services/drafts.ts

import type { DraftDetail } from '../../services/drafts';

export const DRAFT_SAVE_ERROR = 'Could not save draft version';

type SaveDraftEditorContentInput = {
  token: string;
  detail: DraftDetail;
  content: string;
  saveVersion: (
    token: string,
    id: string,
    payload: { content: string; summary: string; expectedCurrentVersionId: string },
  ) => Promise<void>;
  reload: () => Promise<void>;
};

export const saveDraftEditorContent = async ({
  token,
  detail,
  content,
  saveVersion,
  reload,
}: SaveDraftEditorContentInput): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await saveVersion(token, detail.id, {
      content,
      summary: detail.summary || content.slice(0, 180),
      expectedCurrentVersionId: detail.currentVersionId,
    });
    await reload();
    return { ok: true };
  } catch {
    return { ok: false, error: DRAFT_SAVE_ERROR };
  }
};
