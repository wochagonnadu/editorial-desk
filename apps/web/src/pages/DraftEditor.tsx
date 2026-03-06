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
  generateDraftContent,
  reviseDraft,
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
const isClaimConfirmed = (verdict: string) =>
  verdict === 'confirmed' || verdict === 'expert_confirmed';
const verdictLabel = (verdict: string) => verdict.replaceAll('_', ' ');

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
  const [isRunningFactcheck, setIsRunningFactcheck] = useState(false);
  const [isUpdatingDraft, setIsUpdatingDraft] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [confirmingClaimId, setConfirmingClaimId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [factcheckError, setFactcheckError] = useState<string | null>(null);
  const [factcheckSuccess, setFactcheckSuccess] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);
  const [diffSourceVersionId, setDiffSourceVersionId] = useState('');
  const [diffTargetVersionId, setDiffTargetVersionId] = useState('');
  const [editorVersionId, setEditorVersionId] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [needsGeneration, setNeedsGeneration] = useState(false);

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
        setNeedsGeneration(false);
        setIsBootstrapping(true);
        await load();
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : '';
        if (message.toLowerCase().includes('no active version')) {
          setNeedsGeneration(true);
          setError('Draft has no generated version yet. Generate it to continue.');
        } else {
          setError('Could not load draft editor data');
        }
      } finally {
        setIsBootstrapping(false);
      }
    };
    void run();
  }, [id, session]);

  const handleGenerateDraft = async () => {
    if (!session || !id) return;
    try {
      setError(null);
      setIsBootstrapping(true);
      await generateDraftContent(session.token, id);
      await load();
      setNeedsGeneration(false);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError('Could not generate draft');
      }
    } finally {
      setIsBootstrapping(false);
    }
  };

  const pendingComments = useMemo(() => detail?.comments ?? [], [detail]);
  const hasUnsavedChanges = useMemo(
    () => (detail ? content.trim() !== detail.content.trim() : false),
    [content, detail],
  );
  const unresolvedClaimsCount = useMemo(
    () =>
      detail?.factcheckResults.filter((item) => !isClaimConfirmed(item.verdict)).length ?? 0,
    [detail],
  );
  const factcheckStage = useMemo(() => {
    if (isRunningFactcheck) {
      return {
        key: 'running',
        badgeClass: 'status-pill status-factcheck',
        title: 'Factcheck is running',
        description: 'We are verifying the current version and refreshing claims/evidence.',
      };
    }
    if (!detail || detail.factcheckResults.length === 0) {
      return {
        key: 'idle',
        badgeClass: 'status-pill status-drafting',
        title: 'Factcheck not started',
        description: 'Run factcheck before sending this draft for approval.',
      };
    }
    if (!detail.hasCompletedFactcheck || unresolvedClaimsCount > 0) {
      return {
        key: 'needs attention',
        badgeClass: 'status-pill status-review',
        title: 'Factcheck needs attention',
        description:
          unresolvedClaimsCount > 0
            ? `${unresolvedClaimsCount} claim(s) still need review or expert confirmation.`
            : 'Review the latest claim results before moving to approval.',
      };
    }
    return {
      key: 'completed',
      badgeClass: 'status-pill status-approved',
      title: 'Factcheck completed',
      description: 'Claims are verified for the current version. Approval can be sent now.',
    };
  }, [detail, isRunningFactcheck, unresolvedClaimsCount]);
  const claimsNeedingAttention = useMemo(
    () => detail?.factcheckResults.filter((item) => !isClaimConfirmed(item.verdict)) ?? [],
    [detail],
  );
  const verifiedClaims = useMemo(
    () => detail?.factcheckResults.filter((item) => isClaimConfirmed(item.verdict)) ?? [],
    [detail],
  );

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

  const editorVersion = useMemo(
    () => versions.find((version) => version.id === editorVersionId) ?? null,
    [versions, editorVersionId],
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

  useEffect(() => {
    if (!detail) return;
    const versionIds = new Set(versions.map((version) => version.id));
    if (detail.currentVersionId && versionIds.has(detail.currentVersionId)) {
      setEditorVersionId((current) =>
        current && versionIds.has(current) ? current : detail.currentVersionId,
      );
    }
  }, [detail?.currentVersionId, versions, detail]);

  const handleLoadVersionToEditor = () => {
    if (!editorVersion) return;
    setContent(editorVersion.content);
  };

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
    if (!detail.hasCompletedFactcheck) {
      setApprovalSuccess(null);
      setApprovalError('Run factcheck first before sending to approval.');
      return;
    }
    try {
      setApprovalError(null);
      setApprovalSuccess(null);
      setIsSendingReview(true);
      await sendDraftForReview(session.token, detail.id, detail.expertId);
      await load();
      setApprovalSuccess('Draft sent for approval. Reviewer flow is now active.');
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setApprovalError(requestError.message);
      } else {
        setApprovalError('Could not send for approval');
      }
    } finally {
      setIsSendingReview(false);
    }
  };

  const handleRunFactcheck = async () => {
    if (!session || !detail) return;
    try {
      setFactcheckError(null);
      setFactcheckSuccess(null);
      setApprovalError(null);
      setIsRunningFactcheck(true);
      await runDraftFactcheck(session.token, detail.id);
      await load();
      setActiveTab('factcheck');
      setFactcheckSuccess('Factcheck completed. Review claims and evidence before approval.');
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setFactcheckError(requestError.message);
      } else {
        setFactcheckError('Could not run factcheck');
      }
    } finally {
      setIsRunningFactcheck(false);
    }
  };

  const handleUpdateDraft = async () => {
    if (!session || !detail) return;
    if (hasUnsavedChanges) {
      setError('Save draft before Update Draft so comments stay on the same version');
      return;
    }
    const instructionLines = pendingComments
      .map((comment, index) => `${index + 1}. ${comment.text.trim()}`)
      .filter((line) => line.length > 3);
    if (instructionLines.length === 0) {
      setError('Add at least one comment before Update Draft');
      return;
    }

    const instructions = [
      'Apply reviewer comments exactly while preserving expert voice and factual meaning.',
      'Comments:',
      ...instructionLines,
    ].join('\n');

    try {
      setError(null);
      setIsUpdatingDraft(true);
      await reviseDraft(session.token, detail.id, instructions);
      await load();
      setActiveTab('changes');
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError('Could not update draft from comments');
      }
    } finally {
      setIsUpdatingDraft(false);
    }
  };

  const jumpToClaim = (claimText?: string) => {
    if (!claimText || claimText.trim().length < 6) return;
    const index = content.toLowerCase().indexOf(claimText.toLowerCase());
    if (index < 0) return;
    const textarea = document.querySelector('textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.focus();
    textarea.setSelectionRange(index, index + claimText.length);
  };

  const handleCreateComment = async () => {
    if (!session || !detail || commentText.trim().length < 2) return;
    try {
      setError(null);
      setCommentError(null);
      setIsCommenting(true);
      await createDraftComment(session.token, detail.id, commentText.trim());
      setCommentText('');
      await load();
      setActiveTab('changes');
    } catch {
      setCommentError('Could not add comment');
      setError('Could not add comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const confirmClaim = async (claimId: string) => {
    if (!session || !detail || claimId === 'unknown') return;
    try {
      setError(null);
      setClaimError(null);
      setConfirmingClaimId(claimId);
      await confirmDraftClaim(session.token, detail.id, claimId);
      await load();
    } catch {
      setClaimError('Could not confirm claim');
      setError('Could not confirm claim');
    } finally {
      setConfirmingClaimId(null);
    }
  };

  if (!detail && isBootstrapping) {
    return <div className="card text-ink-500">Loading draft...</div>;
  }

  if (!detail && needsGeneration) {
    return (
      <div className="card space-y-3">
        <p className="text-ink-700">{error ?? 'Draft has no generated version yet.'}</p>
        <button type="button" className="btn-primary" onClick={handleGenerateDraft}>
          Generate draft now
        </button>
      </div>
    );
  }

  if (!detail) {
    return <div className="card text-red-600">{error ?? 'Could not load draft editor data'}</div>;
  }

  return (
    <div className="-mx-4 flex flex-col md:-mx-6 lg:-m-8 lg:h-[calc(100dvh-4rem)]">
      <header className="flex flex-shrink-0 flex-col gap-4 border-b border-ink-100 bg-white px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-start space-x-4">
          <Link to="/app/drafts" className="p-2 hover:bg-beige-50 rounded-full text-ink-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-serif font-medium break-words">{detail.topicTitle}</h1>
              <span className="status-pill status-review">{toStatus(detail.status)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
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
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <button
            className="btn-secondary px-4 py-2 text-sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save draft'}
          </button>
          <button
            className="btn-secondary px-4 py-2 text-sm"
            onClick={handleUpdateDraft}
            disabled={isUpdatingDraft || pendingComments.length === 0}
          >
            {isUpdatingDraft ? 'Updating...' : 'Update draft'}
          </button>
        </div>
      </header>

      <div className="border-b border-ink-100 bg-white px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="rounded-2xl border border-ink-100 bg-beige-50 p-4 xl:max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={factcheckStage.badgeClass}>{factcheckStage.key}</span>
              <span className="text-xs uppercase tracking-wide text-ink-500">Factcheck stage</span>
            </div>
            <p className="mt-3 text-sm font-medium text-ink-900">{factcheckStage.title}</p>
            <p className="mt-1 text-sm text-ink-600">{factcheckStage.description}</p>
            <p className="mt-2 text-xs text-ink-500">
              Claims found: {detail.factcheckResults.length} • Needs attention:{' '}
              {unresolvedClaimsCount}
            </p>
          </div>

          <div className="grid gap-3 xl:min-w-[22rem]">
            <div className="rounded-2xl border border-ink-100 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-500">Step 1</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">Run factcheck</p>
                  <p className="text-xs text-ink-500">
                    Verify claims and refresh evidence for the current draft version.
                  </p>
                </div>
                <button
                  className="btn-secondary px-4 py-2 text-sm"
                  onClick={handleRunFactcheck}
                  disabled={isRunningFactcheck}
                >
                  {isRunningFactcheck ? 'Running...' : 'Run factcheck'}
                </button>
              </div>
              {factcheckError ? <p className="mt-3 text-sm text-red-600">{factcheckError}</p> : null}
              {factcheckSuccess ? (
                <p className="mt-3 text-sm text-approved-700">{factcheckSuccess}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-ink-100 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-500">Step 2</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">Send for approval</p>
                  <p className="text-xs text-ink-500">
                    Start reviewer flow only after factcheck is complete for this version.
                  </p>
                </div>
                <button
                  className="btn-primary px-4 py-2 text-sm"
                  onClick={handleSendForReview}
                  disabled={isSendingReview || !detail.hasCompletedFactcheck}
                >
                  {isSendingReview ? 'Sending...' : 'Send for approval'}
                </button>
              </div>
              {!detail.hasCompletedFactcheck ? (
                <p className="mt-3 text-sm text-ink-600">
                  Approval unlocks after a successful factcheck run.
                </p>
              ) : null}
              {approvalError ? <p className="mt-3 text-sm text-red-600">{approvalError}</p> : null}
              {approvalSuccess ? (
                <p className="mt-3 text-sm text-approved-700">{approvalSuccess}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600 md:px-6 lg:px-8">
          {error}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <div className="flex-1 bg-beige-50 p-4 md:p-6 lg:overflow-y-auto lg:p-8">
          <div className="mx-auto max-w-3xl space-y-4 rounded-slide-sm border border-ink-100 bg-white p-4 shadow-sm md:p-6 lg:min-h-full lg:p-8">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[50vh] w-full text-base leading-relaxed text-ink-800 focus:outline-none lg:min-h-[60vh]"
            />
            <div className="border-t border-ink-100 pt-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <label className="text-xs text-ink-500">Load version into editor</label>
                <div className="flex gap-2">
                  <select
                    value={editorVersionId}
                    onChange={(event) => setEditorVersionId(event.target.value)}
                    className="px-3 py-2 text-sm rounded-xl border border-ink-200"
                  >
                    <option value="">Select version</option>
                    {versions.map((version) => (
                      <option key={`editor-${version.id}`} value={version.id}>
                        v{version.versionNumber} -{' '}
                        {new Date(version.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleLoadVersionToEditor}
                    disabled={!editorVersion}
                  >
                    Load version
                  </button>
                </div>
              </div>
              {editorVersion && editorVersion.id !== detail.currentVersionId ? (
                <p className="text-xs text-ink-500">
                  You are editing from historical version v{editorVersion.versionNumber}. Saving
                  will create a new latest version.
                </p>
              ) : null}
            </div>
            <div className="border-t border-ink-100 pt-4">
              <p className="text-xs text-ink-500 mb-2">Add comment for this version</p>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write reviewer note"
                  className="flex-1 px-3 py-2 rounded-xl border border-ink-200"
                />
                <button
                  type="button"
                  onClick={handleCreateComment}
                  className="btn-secondary"
                  disabled={isCommenting || commentText.trim().length < 2}
                >
                  {isCommenting ? 'Adding...' : 'Comment'}
                </button>
              </div>
              {commentError ? <p className="mt-2 text-sm text-red-600">{commentError}</p> : null}
            </div>
          </div>
        </div>

        <div className="w-full flex-shrink-0 border-t border-ink-100 bg-white lg:w-80 lg:border-l lg:border-t-0 lg:flex lg:flex-col">
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

          <div className="p-4 lg:flex-1 lg:overflow-y-auto">
            {activeTab === 'factcheck' ? (
              <div className="space-y-3">
                {detail.factcheckResults.length === 0 ? (
                  <div className="text-sm text-ink-500">No factcheck results yet.</div>
                ) : (
                  <>
                    <div className="rounded-xl border border-ink-100 bg-beige-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-ink-500">
                        Current factcheck run
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-ink-500">Claims found</p>
                          <p className="font-medium text-ink-900">{detail.factcheckResults.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-500">Needs attention</p>
                          <p className="font-medium text-warning-700">{claimsNeedingAttention.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-500">Verified</p>
                          <p className="font-medium text-approved-700">{verifiedClaims.length}</p>
                        </div>
                      </div>
                    </div>

                    {claimsNeedingAttention.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-ink-500">
                          Needs attention before approval
                        </p>
                        {claimsNeedingAttention.map((item) => (
                          <div
                            key={item.claimId}
                            className="rounded-xl border border-warning-200 bg-warning-50 p-3"
                          >
                            <div className="flex items-start space-x-2">
                              <ShieldAlert className="mt-0.5 h-4 w-4 text-warning-700" />
                              <div className="min-w-0 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-ink-900">
                                    Claim: {item.text ?? 'Claim text unavailable'}
                                  </p>
                                  <span className="status-pill status-review">
                                    {verdictLabel(item.verdict)}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-ink-600">
                                  Risk level: {item.riskLevel ?? 'n/a'}
                                </p>
                                <p className="mt-1 text-xs text-ink-600">
                                  Notes: {item.notes ?? 'Manual review required before approval.'}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="text-xs underline"
                                    onClick={() => jumpToClaim(item.text)}
                                  >
                                    Highlight in text
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs underline disabled:no-underline disabled:opacity-50"
                                    onClick={() => confirmClaim(item.claimId)}
                                    disabled={confirmingClaimId === item.claimId}
                                  >
                                    {confirmingClaimId === item.claimId
                                      ? 'Confirming...'
                                      : 'Mark expert confirmed'}
                                  </button>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                                    Evidence and sources
                                  </p>
                                  {Array.isArray(item.evidence) && item.evidence.length > 0 ? (
                                    item.evidence.map((evidence, idx) => (
                                      <div
                                        key={`${item.claimId}-evidence-${idx}`}
                                        className="rounded-lg border border-warning-200/60 bg-white/80 p-2 text-xs text-ink-600"
                                      >
                                        <p className="font-medium text-ink-700">
                                          {evidence.source ?? `Source ${idx + 1}`}
                                        </p>
                                        {evidence.snippet ? (
                                          <p className="mt-1">{evidence.snippet}</p>
                                        ) : (
                                          <p className="mt-1">No snippet provided.</p>
                                        )}
                                        {evidence.url ? (
                                          <a
                                            href={evidence.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 inline-block underline"
                                          >
                                            Open source
                                          </a>
                                        ) : null}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-ink-600">
                                      No evidence links were returned for this claim. Manual review
                                      is still required.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {verifiedClaims.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-ink-500">
                          Verified in this run
                        </p>
                        {verifiedClaims.map((item) => (
                          <div
                            key={item.claimId}
                            className="rounded-xl border border-approved-200 bg-approved-50 p-3"
                          >
                            <div className="flex items-start space-x-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-approved-700" />
                              <div className="min-w-0 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-ink-900">
                                    Claim: {item.text ?? 'Claim text unavailable'}
                                  </p>
                                  <span className="status-pill status-approved">
                                    {verdictLabel(item.verdict)}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-ink-600">
                                  Risk level: {item.riskLevel ?? 'n/a'}
                                </p>
                                <p className="mt-1 text-xs text-ink-600">
                                  Notes: {item.notes ?? 'Verified in current factcheck run.'}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="text-xs underline"
                                    onClick={() => jumpToClaim(item.text)}
                                  >
                                    Highlight in text
                                  </button>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                                    Evidence and sources
                                  </p>
                                  {Array.isArray(item.evidence) && item.evidence.length > 0 ? (
                                    item.evidence.map((evidence, idx) => (
                                      <div
                                        key={`${item.claimId}-evidence-${idx}`}
                                        className="rounded-lg border border-approved-200/60 bg-white/80 p-2 text-xs text-ink-600"
                                      >
                                        <p className="font-medium text-ink-700">
                                          {evidence.source ?? `Source ${idx + 1}`}
                                        </p>
                                        {evidence.snippet ? (
                                          <p className="mt-1">{evidence.snippet}</p>
                                        ) : (
                                          <p className="mt-1">No snippet provided.</p>
                                        )}
                                        {evidence.url ? (
                                          <a
                                            href={evidence.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 inline-block underline"
                                          >
                                            Open source
                                          </a>
                                        ) : null}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-ink-600">
                                      No evidence links were returned for this claim.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
                {claimError ? <p className="text-sm text-red-600">{claimError}</p> : null}
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
