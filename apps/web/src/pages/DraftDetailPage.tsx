// PATH: apps/web/src/pages/DraftDetailPage.tsx
// WHAT: Draft detail page with factcheck, comments, and version history
// WHY:  Provides manager workspace for review and revision instructions
// RELEVANT: apps/web/src/components/PipelineControls.tsx,apps/web/src/services/editorial-api.ts

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PipelineControls } from '../components/PipelineControls';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import type { DraftDetail } from '../services/editorial-types';

export const DraftDetailPage = () => {
  const { id = '' } = useParams();
  const { token } = useAuth();
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);
  const [commentText, setCommentText] = useState('');

  const load = async () => {
    if (!token || !id) return;
    setDraft(await editorialApi.getDraft(token, id));
    setVersions((await editorialApi.getDraftVersions(token, id)).data);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token, id]);

  if (!token || !draft) return <p>Loading draft...</p>;

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    await editorialApi.addComment(token, id, commentText);
    setCommentText('');
    await load();
  };

  return (
    <section className="card">
      <h2>{draft.topic?.title ?? 'Draft'}</h2>
      <p>Status: {draft.status}</p>
      <p>Voice score: {draft.current_version?.voiceScore ?? '-'}</p>
      <article className="card"><h3>Current version</h3><p>{draft.current_version?.content ?? 'No content yet'}</p></article>
      <article className="card"><h3>Factcheck</h3><pre>{JSON.stringify(draft.factcheck_report, null, 2)}</pre></article>
      <form className="card" onSubmit={submitComment}><h3>Add comment</h3><input value={commentText} onChange={(event) => setCommentText(event.target.value)} /><button type="submit">Save comment</button></form>
      <article className="card"><h3>Versions</h3><pre>{JSON.stringify(versions, null, 2)}</pre></article>
      <PipelineControls token={token} draftId={id} onDone={load} />
    </section>
  );
};
