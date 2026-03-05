// PATH: apps/web/src/pages/DraftEditor.tsx
// WHAT: Draft editor wired to detail/versions/audit/comments/draft actions APIs
// WHY:  Replaces static editor workspace with real draft lifecycle data
// RELEVANT: apps/web/src/services/drafts.ts,apps/web/src/services/audit.ts

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock, MessageSquare, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { buildDraftDiffSummary } from '../lib/draft-diff';
import {
  confirmDraftClaim,
  createDraftComment,
  fetchDraftDetail,
  runDraftFactcheck,
  fetchDraftVersions,
  saveDraftVersion,
  sendDraftForReview,
  type DraftDetail,
  type DraftVersion,
} from '../services/drafts';
import { fetchDraftAudit, type AuditEvent } from '../services/audit';
import { ApiError } from '../services/api/client';
import { useSession } from '../services/session';

type Tab = 'factcheck' | 'changes' | 'audit';

const toStatus = (value: string) => value.replaceAll('_', ' ');

export function DraftEditor() {
  const { id = '' } = useParams();
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('factcheck');
  const [detail, setDetail] = useState<DraftDetail | null>(null);
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [content, setContent] = useState('');
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReview, setIsSendingReview] = useState(false);
  const [diffSourceVersionId, setDiffSourceVersionId] = useState('');
  const [diffTargetVersionId, setDiffTargetVersionId] = useState('');

  const load = async () => {
    if (!session || !id) return;
    const [nextDetail, nextVersions, nextAudit] = await Promise.all([
      fetchDraftDetail(session.token, id),
      fetchDraftVersions(session.token, id),
      fetchDraftAudit(session.token, id),
    ]);
    setDetail(nextDetail);
    setContent(nextDetail.content);
    setVersions(nextVersions);
    setAudit(nextAudit);
  };

  useEffect(() => {
    if (!session || !id) return;
    const run = async () => {
      try {
        setError(null);
        await load();
      } catch {
        setError('Could not load draft editor data');
      }
    };
    void run();
  }, [id, session]);

  const pendingComments = useMemo(() => detail?.comments ?? [], [detail]);

  useEffect(() => {
    if (versions.length === 0) {
      setDiffSourceVersionId('');
      setDiffTargetVersionId('');
      return;
    }

    const versionIds = new Set(versions.map((version) => version.id));
    const defaultTarget =
      detail?.currentVersionId && versionIds.has(detail.currentVersionId)
        ? detail.currentVersionId
        : versions[0].id;
    const defaultSource = versions.find((version) => version.id !== defaultTarget)?.id ?? '';

    setDiffTargetVersionId((current) =>
      current && versionIds.has(current) ? current : defaultTarget,
    );
    setDiffSourceVersionId((current) =>
      current && versionIds.has(current) ? current : defaultSource,
    );
  }, [versions, detail?.currentVersionId]);

  const diffSourceVersion = useMemo(
    () => versions.find((version) => version.id === diffSourceVersionId) ?? null,
    [versions, diffSourceVersionId],
  );

  const diffTargetVersion = useMemo(
    () => versions.find((version) => version.id === diffTargetVersionId) ?? null,
    [versions, diffTargetVersionId],
  );

  const diffFallback = useMemo(() => {
    if (versions.length < 2) return 'Need at least two versions to compare.';
    if (!diffSourceVersionId || !diffTargetVersionId) {
      return 'Select source and target versions to compare.';
    }
    if (diffSourceVersionId === diffTargetVersionId) return 'Choose two different versions.';
    if (!diffSourceVersion || !diffTargetVersion) {
      return 'Selected version data is unavailable. Reload draft and try again.';
    }
    if (!diffSourceVersion.content.trim() || !diffTargetVersion.content.trim()) {
      return 'Diff is unavailable because one selected version has empty content.';
    }
    return null;
  }, [
    versions.length,
    diffSourceVersionId,
    diffTargetVersionId,
    diffSourceVersion,
    diffTargetVersion,
  ]);

  const diffSummary = useMemo(() => {
    if (diffFallback || !diffSourceVersion || !diffTargetVersion) return null;
    return buildDraftDiffSummary(diffSourceVersion.content, diffTargetVersion.content);
  }, [diffFallback, diffSourceVersion, diffTargetVersion]);

  const handleSave = async () => {
    if (!session || !detail) return;
    try {
      setError(null);
      setIsSaving(true);
      await saveDraftVersion(session.token, detail.id, {
        content,
        summary: detail.summary || content.slice(0, 180),
        expectedCurrentVersionId: detail.currentVersionId,
      });
      await load();
    } catch {
      setError('Could not save draft version');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendForReview = async () => {
    if (!session || !detail) return;
    try {
      setError(null);
      setIsSendingReview(true);
      if (!detail.hasCompletedFactcheck) {
        await runDraftFactcheck(session.token, detail.id);
      }
      await sendDraftForReview(session.token, detail.id, detail.expertId);
      await load();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError('Could not send for approval');
      }
    } finally {
      setIsSendingReview(false);
    }
  };

  const handleCreateComment = async () => {
    if (!session || !detail || commentText.trim().length < 2) return;
    try {
      setError(null);
      await createDraftComment(session.token, detail.id, commentText.trim());
      setCommentText('');
      await load();
      setActiveTab('changes');
    } catch {
      setError('Could not add comment');
    }
  };

  const confirmClaim = async (claimId: string) => {
    if (!session || !detail || claimId === 'unknown') return;
    try {
      setError(null);
      await confirmDraftClaim(session.token, detail.id, claimId);
      await load();
    } catch {
      setError('Could not confirm claim');
    }
  };

  if (!detail) {
    return <div className="card text-ink-500">Loading draft...</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-8">
      <header className="bg-white border-b border-ink-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link to="/app/drafts" className="p-2 hover:bg-beige-50 rounded-full text-ink-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-serif font-medium">{detail.topicTitle}</h1>
              <span className="status-pill status-review">{toStatus(detail.status)}</span>
            </div>
            <div className="flex items-center text-sm text-ink-500 mt-1 space-x-4">
              <span>v{detail.currentVersionNumber}</span>
              <span>•</span>
              <span>{detail.expertName}</span>
              <span>•</span>
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {versions.length} versions
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save draft'}
          </button>
          <button className="btn-primary" onClick={handleSendForReview} disabled={isSendingReview}>
            {isSendingReview
              ? 'Running checks...'
              : detail.hasCompletedFactcheck
                ? 'Send for approval'
                : 'Factcheck + send for approval'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="px-8 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      ) : null}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 bg-beige-50">
          <div className="max-w-3xl mx-auto bg-white border border-ink-100 rounded-slide-sm shadow-sm min-h-full p-8 space-y-4">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="w-full min-h-[60vh] text-base leading-relaxed text-ink-800 focus:outline-none"
            />
            <div className="border-t border-ink-100 pt-4">
              <p className="text-xs text-ink-500 mb-2">Add comment for this version</p>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write reviewer note"
                  className="flex-1 px-3 py-2 rounded-xl border border-ink-200"
                />
                <button type="button" onClick={handleCreateComment} className="btn-secondary">
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-80 bg-white border-l border-ink-100 flex flex-col flex-shrink-0">
          <div className="flex border-b border-ink-100 relative">
            {(['factcheck', 'changes', 'audit'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === tab ? 'text-ink-900' : 'text-ink-500'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'factcheck' ? (
              <div className="space-y-3">
                {detail.factcheckResults.length === 0 ? (
                  <div className="text-sm text-ink-500">No factcheck results yet.</div>
                ) : (
                  detail.factcheckResults.map((item) => {
                    const isConfirmed =
                      item.verdict === 'confirmed' || item.verdict === 'expert_confirmed';
                    return (
                      <div
                        key={item.claimId}
                        className={`rounded-xl p-3 border ${isConfirmed ? 'bg-approved-50 border-approved-200' : 'bg-warning-50 border-warning-200'}`}
                      >
                        <div className="flex items-start space-x-2">
                          {isConfirmed ? (
                            <CheckCircle2 className="w-4 h-4 text-approved-700 mt-0.5" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-warning-700 mt-0.5" />
                          )}
                          <div className="text-sm">
                            <p className="font-medium">Verdict: {item.verdict}</p>
                            <p className="text-xs text-ink-600 mt-1">{item.notes ?? 'No notes'}</p>
                            {!isConfirmed ? (
                              <button
                                type="button"
                                className="text-xs mt-2 underline"
                                onClick={() => confirmClaim(item.claimId)}
                              >
                                Mark expert confirmed
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {activeTab === 'changes' ? (
              <div className="space-y-3">
                <div className="border border-ink-100 rounded-xl p-3 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">What changed</p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-ink-500 mb-1">Source version</label>
                      <select
                        value={diffSourceVersionId}
                        onChange={(event) => setDiffSourceVersionId(event.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-ink-200"
                      >
                        <option value="">Select source version</option>
                        {versions.map((version) => (
                          <option key={`source-${version.id}`} value={version.id}>
                            v{version.versionNumber} -{' '}
                            {new Date(version.createdAt).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-ink-500 mb-1">Target version</label>
                      <select
                        value={diffTargetVersionId}
                        onChange={(event) => setDiffTargetVersionId(event.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-ink-200"
                      >
                        <option value="">Select target version</option>
                        {versions.map((version) => (
                          <option key={`target-${version.id}`} value={version.id}>
                            v{version.versionNumber} -{' '}
                            {new Date(version.createdAt).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {diffFallback ? (
                    <p className="text-xs text-ink-600">{diffFallback}</p>
                  ) : diffSummary && diffSummary.bullets.length > 0 ? (
                    <>
                      <p className="text-xs text-ink-500">
                        Paragraphs +{diffSummary.addedParagraphs} / -{diffSummary.removedParagraphs}
                        {' | '}Lines +{diffSummary.lineAdds} / -{diffSummary.lineRemoves}
                      </p>
                      <ul className="space-y-1">
                        {diffSummary.bullets.map((item, index) => (
                          <li key={`${item}-${index}`} className="text-xs text-ink-700">
                            - {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-xs text-ink-600">
                      No meaningful text changes between versions.
                    </p>
                  )}
                </div>

                {pendingComments.length === 0 ? (
                  <div className="text-center py-8 text-ink-500 text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No comments yet.
                  </div>
                ) : (
                  pendingComments.map((comment) => (
                    <div key={comment.id} className="border border-ink-100 rounded-xl p-3">
                      <p className="text-sm text-ink-800">{comment.text}</p>
                      <p className="text-xs text-ink-500 mt-1">
                        {comment.authorType} • {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {activeTab === 'audit' ? (
              <div className="space-y-3">
                {audit.length === 0 ? (
                  <div className="text-sm text-ink-500">No audit events for this draft.</div>
                ) : (
                  audit.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 border border-ink-100 rounded-xl p-3"
                    >
                      <History className="w-4 h-4 text-ink-500 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-ink-900">{event.action}</p>
                        <p className="text-xs text-ink-500">
                          {event.actorName} • {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
