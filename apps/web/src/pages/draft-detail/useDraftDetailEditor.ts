// PATH: apps/web/src/pages/draft-detail/useDraftDetailEditor.ts
// WHAT: Хук состояния Draft Editor: загрузка, save version, send for review
// WHY:  Отделяет orchestration от JSX и держит page-файл компактным
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-api.ts

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { editorialApi } from '../../services/editorial-api';
import type { AuditEntry, DraftDetail, DraftVersionItem } from '../../services/editorial-types';

export type SideTab = 'factcheck' | 'changes' | 'audit';
type Loaded = { draft: DraftDetail | null; versions: DraftVersionItem[]; audit: AuditEntry[] };

export function useDraftDetailEditor(draftId: string, requestedReviewVersion: number) {
  const { token, user } = useAuth();
  const [data, setData] = useState<Loaded>({ draft: null, versions: [], audit: [] });
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [editorContent, setEditorContent] = useState('');
  const [tab, setTab] = useState<SideTab>('factcheck');
  const [note, setNote] = useState('');

  const load = async () => {
    if (!token || !draftId) return;
    const [draft, versions, audit] = await Promise.all([
      editorialApi.getDraft(token, draftId),
      editorialApi.getDraftVersions(token, draftId).then((r) => r.data),
      editorialApi
        .getAudit(token, { entity_type: 'draft', entity_id: draftId, limit: 20 })
        .then((r) => r.data),
    ]);
    const fallbackId = draft.current_version?.id ?? versions[0]?.id;
    const activeId =
      selectedVersionId && versions.some((v) => v.id === selectedVersionId)
        ? selectedVersionId
        : fallbackId;
    const active = versions.find((v) => v.id === activeId);
    setData({ draft, versions, audit });
    setSelectedVersionId(activeId);
    setEditorContent(String(active?.content ?? draft.current_version?.content ?? ''));
  };

  useEffect(() => {
    load().catch(() => setNote('Could not load draft details.'));
  }, [token, draftId]);
  useEffect(() => {
    const selected = data.versions.find((v) => v.id === selectedVersionId);
    if (selected) setEditorContent(String(selected.content ?? ''));
  }, [selectedVersionId, data.versions]);

  const activeVersion = useMemo(
    () => data.versions.find((v) => v.id === selectedVersionId) ?? data.versions[0],
    [data.versions, selectedVersionId],
  );
  const latestNumber = data.versions[0]?.versionNumber ?? data.versions[0]?.version_number ?? 0;
  const staleWarning = requestedReviewVersion > 0 && Number(latestNumber) > requestedReviewVersion;
  const factcheckReady = data.draft?.factcheck_report?.status === 'completed';

  const saveVersion = async () => {
    if (!token || !data.draft || !activeVersion || !editorContent.trim()) return;
    const expected = data.draft.current_version?.id;
    const latest = await editorialApi.getDraft(token, draftId);
    if (expected && latest.current_version?.id && latest.current_version.id !== expected)
      setNote('Another editor created a new version. Saving on top of the latest version.');
    const saved = await editorialApi.saveDraftVersion(token, draftId, {
      content: editorContent,
      expected_current_version_id: expected,
    });
    await load();
    setSelectedVersionId(saved.id);
    if (saved.concurrent_edit) setNote('Concurrent edit detected. Version list refreshed.');
  };

  const sendForApproval = async () => {
    if (!token || !user || !factcheckReady) return;
    await editorialApi.sendForReview(token, draftId, {
      flow_type: 'sequential',
      deadline_hours: 48,
      steps: [{ approver_type: 'user', approver_id: user.id }],
    });
    setNote('Draft moved to Needs Review.');
    await load();
  };

  return {
    token,
    data,
    tab,
    setTab,
    note,
    editorContent,
    setEditorContent,
    selectedVersionId,
    setSelectedVersionId,
    staleWarning,
    factcheckReady,
    load,
    saveVersion,
    sendForApproval,
  };
}
