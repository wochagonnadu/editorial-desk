// PATH: apps/web/src/pages/PublicDoc.tsx
// WHAT: Public read-only document screen opened by magic-link token
// WHY:  Gives approvers a direct web surface without app authentication
// RELEVANT: apps/web/src/App.tsx,apps/web/src/services/docs.ts

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../services/api/client';
import { fetchPublicDoc, type PublicDoc as PublicDocData } from '../services/docs';

const toStatusLabel = (value: string) => value.replaceAll('_', ' ');

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
      nextStep: 'Ask editorial team to send a new review link for the latest version.',
    };
  }

  if (error.code === 'STALE_VERSION') {
    return {
      title: 'This link points to an old version',
      nextStep: 'Ask editorial team for a fresh link to review the current draft version.',
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
        <pre className="mt-6 text-base leading-relaxed text-ink-800 whitespace-pre-wrap font-sans">
          {doc.currentVersion.content}
        </pre>
      </article>
    </div>
  );
}
