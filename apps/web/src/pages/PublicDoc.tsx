// PATH: apps/web/src/pages/PublicDoc.tsx
// WHAT: Public read-only document screen opened by magic-link token
// WHY:  Gives approvers a direct web surface without app authentication
// RELEVANT: apps/web/src/App.tsx,apps/web/src/services/docs.ts

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../services/api/client';
import { fetchPublicDoc, type PublicDoc as PublicDocData } from '../services/docs';

const toStatusLabel = (value: string) => value.replaceAll('_', ' ');

export function PublicDoc() {
  const { draftId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [doc, setDoc] = useState<PublicDocData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!draftId || !token) {
        setError('Magic link is invalid. Please request a new link from editorial team.');
        setIsLoading(false);
        return;
      }
      try {
        setError(null);
        setIsLoading(true);
        setDoc(await fetchPublicDoc(draftId, token));
      } catch (requestError) {
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError('Could not load document');
        }
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [draftId, token]);

  if (isLoading) return <div className="card max-w-3xl mx-auto mt-8">Loading document...</div>;
  if (error) return <div className="card max-w-3xl mx-auto mt-8 text-red-600">{error}</div>;
  if (!doc || !doc.currentVersion) {
    return <div className="card max-w-3xl mx-auto mt-8">Document is empty.</div>;
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
