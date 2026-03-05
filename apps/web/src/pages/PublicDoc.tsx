// PATH: apps/web/src/pages/PublicDoc.tsx
// WHAT: Public read-only document screen opened by magic-link token
// WHY:  Gives approvers a direct web surface without app authentication
// RELEVANT: apps/web/src/App.tsx,apps/web/src/services/docs.ts

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { buildPublicDocDiffView } from '../lib/public-doc-diff';
import { ApiError } from '../services/api/client';
import { fetchPublicDoc, type PublicDoc as PublicDocData } from '../services/docs';

const toStatusLabel = (value: string) => value.replaceAll('_', ' ');

const toDateTime = (value?: string): string => {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleString();
};

type ViewState = 'loading' | 'error' | 'empty' | 'success';

const mapPublicDocError = (error: ApiError | null): { title: string; nextStep: string } => {
  if (!error) {
    return {
      title: 'Could not load document',
      nextStep: 'Please try again in a minute or ask editorial team to resend the link.',
    };
  }

  if (error.code === 'TOKEN_EXPIRED') {
    return {
      title: 'This link has expired',
      nextStep:
        'Reason: security TTL for this link ended. Ask editorial team to send a new review link for the latest version.',
    };
  }

  if (error.code === 'STALE_VERSION') {
    return {
      title: 'This link points to an old version',
      nextStep:
        'Reason: a newer draft version already exists. Ask editorial team for a fresh link to review the current version.',
    };
  }

  if (error.code === 'INVALID_TOKEN') {
    return {
      title: 'This link is invalid',
      nextStep: 'Check that the full URL is copied from the email or request a new link.',
    };
  }

  return {
    title: error.message,
    nextStep: 'Please try again in a minute or ask editorial team to resend the link.',
  };
};

export function PublicDoc() {
  const { draftId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [doc, setDoc] = useState<PublicDocData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      if (!draftId || !token) {
        setDoc(null);
        setError(new ApiError(401, 'INVALID_TOKEN', 'This link is invalid'));
        setViewState('error');
        return;
      }
      try {
        setDoc(null);
        setError(null);
        setViewState('loading');
        const nextDoc = await fetchPublicDoc(draftId, token, controller.signal);
        const nextContent = nextDoc.currentVersion?.content ?? '';
        if (!nextDoc.currentVersion || !nextContent.trim()) {
          setDoc(nextDoc);
          setViewState('empty');
          return;
        }
        setDoc(nextDoc);
        setViewState('success');
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }
        if (requestError instanceof ApiError) {
          setError(requestError);
        } else {
          setError(new ApiError(500, 'API_ERROR', 'Could not load document'));
        }
        setViewState('error');
      }
    };
    void run();

    return () => {
      controller.abort();
    };
  }, [draftId, token]);

  const diffFallback = useMemo(() => {
    if (!doc || !doc.diff) return 'Diff is unavailable for this document.';
    if (!doc.diff.sourceVersion) {
      return 'No base version is available yet. This is the first version.';
    }
    if (!doc.diff.sourceContent?.trim() || !doc.diff.targetContent?.trim()) {
      return 'Diff is unavailable because one compared version has empty content.';
    }
    return null;
  }, [doc]);

  const diffView = useMemo(() => {
    if (!doc || !doc.diff || diffFallback) return null;
    return buildPublicDocDiffView(doc.diff.sourceContent ?? '', doc.diff.targetContent, 40);
  }, [doc, diffFallback]);

  const diffSummaryBullets = useMemo(() => {
    if (!doc?.diff) return [];
    const baseBullets = doc.diff.summary
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (baseBullets.length >= 3 || !diffView || diffFallback) return baseBullets;

    const augmented = [
      ...baseBullets,
      `Compared v${doc.diff.sourceVersion?.versionNumber ?? 'n/a'} to v${doc.diff.targetVersion.versionNumber}`,
      `Added lines: ${diffView.addedCount}`,
      `Removed lines: ${diffView.removedCount}`,
    ];
    return Array.from(new Set(augmented)).slice(0, 5);
  }, [doc, diffView, diffFallback]);

  if (viewState === 'loading') {
    return <div className="card max-w-3xl mx-auto mt-8">Loading document...</div>;
  }

  if (viewState === 'error') {
    const message = mapPublicDocError(error);
    return (
      <div className="card max-w-3xl mx-auto mt-8">
        <p className="text-base font-medium text-red-700">{message.title}</p>
        <p className="text-sm text-ink-600 mt-2">{message.nextStep}</p>
      </div>
    );
  }

  if (viewState === 'empty' || !doc || !doc.currentVersion) {
    return (
      <div className="card max-w-3xl mx-auto mt-8">
        <p className="text-base font-medium text-ink-900">Document is empty</p>
        <p className="text-sm text-ink-600 mt-2">
          Ask editorial team to resend the link after a new version is prepared.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige-50 py-8 px-4">
      <article className="max-w-3xl mx-auto bg-white border border-ink-100 rounded-slide-sm shadow-sm p-8">
        <header className="pb-5 border-b border-ink-100 space-y-2">
          <h1 className="text-2xl font-serif">{doc.topic?.title ?? 'Untitled draft'}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <span className="status-pill status-review">{toStatusLabel(doc.status)}</span>
            <span>Expert: {doc.expert?.name ?? 'Unknown expert'}</span>
            <span>Version: v{doc.currentVersion.versionNumber}</span>
            {doc.readOnly ? <span>Read only</span> : null}
          </div>
        </header>
        <section className="mt-5 rounded-xl border border-ink-100 bg-beige-50 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-ink-500">Version context</p>
          <div className="grid gap-2 text-sm text-ink-700 md:grid-cols-2">
            <p>
              Current version:{' '}
              <strong>
                v{doc.versionContext?.current.versionNumber ?? doc.currentVersion.versionNumber}
              </strong>
            </p>
            <p>
              Base version:{' '}
              <strong>
                {doc.versionContext?.base
                  ? `v${doc.versionContext.base.versionNumber}`
                  : 'Initial version'}
              </strong>
            </p>
            <p>
              Updated at:{' '}
              <strong>
                {toDateTime(doc.versionContext?.current.createdAt ?? doc.currentVersion.createdAt)}
              </strong>
            </p>
            <p>
              Status: <strong>{toStatusLabel(doc.status)}</strong>
            </p>
          </div>
          <p className="text-xs text-ink-600">
            You are viewing the latest version available for this link.
          </p>
        </section>
        <section className="mt-5 rounded-xl border border-ink-100 bg-white p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-ink-500">What changed</p>

          {diffSummaryBullets.length > 0 ? (
            <ul className="space-y-1">
              {diffSummaryBullets.map((item, index) => (
                <li key={`${item}-${index}`} className="text-sm text-ink-700">
                  - {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-600">Summary is unavailable for this comparison.</p>
          )}

          <div className="pt-2 border-t border-ink-100 space-y-2">
            <p className="text-xs uppercase tracking-wide text-ink-500">
              Diff view (base to current)
            </p>

            {diffFallback ? (
              <p className="text-sm text-ink-600">{diffFallback}</p>
            ) : diffView && diffView.rows.length > 0 ? (
              <>
                <p className="text-xs text-ink-500">
                  Lines: +{diffView.addedCount} / -{diffView.removedCount}
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-ink-100 p-2">
                  {diffView.rows.map((row, index) => (
                    <div
                      key={`${row.type}-${index}-${row.text}`}
                      className={`text-xs px-2 py-1 rounded ${row.type === 'added' ? 'bg-approved-50 text-approved-800' : 'bg-red-50 text-red-700'}`}
                    >
                      {row.type === 'added' ? '+' : '-'} {row.text}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-600">
                No line-level differences between base and current versions.
              </p>
            )}
          </div>
        </section>
        <pre className="mt-6 text-base leading-relaxed text-ink-800 whitespace-pre-wrap font-sans">
          {doc.currentVersion.content}
        </pre>
      </article>
    </div>
  );
}
