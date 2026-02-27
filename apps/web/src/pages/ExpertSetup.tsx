// PATH: apps/web/src/pages/ExpertSetup.tsx
// WHAT: Expert setup form wired to POST /api/v1/experts
// WHY:  Converts invite flow from UI-only step into real expert creation
// RELEVANT: apps/web/src/pages/Experts.tsx,apps/web/src/services/experts.ts

import { useState } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createExpert } from '../services/experts';
import { useSession } from '../services/session';

export function ExpertSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useSession();

  const [name, setName] = useState<string>(location.state?.name ?? '');
  const [roleTitle, setRoleTitle] = useState<string>(location.state?.role ?? '');
  const [email, setEmail] = useState<string>(location.state?.email ?? '');
  const [domain, setDomain] = useState<'medical' | 'legal' | 'education' | 'business'>('business');
  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addUrl = () => {
    if (!urlInput.trim()) return;
    setUrls((current) => [...current, urlInput.trim()]);
    setUrlInput('');
  };

  const save = async () => {
    if (!session) return;
    try {
      setError(null);
      setIsSaving(true);
      const id = await createExpert(session.token, {
        name,
        roleTitle,
        email,
        domain,
        publicTextUrls: urls,
      });
      navigate(`/app/experts/${id}`, { replace: true });
    } catch {
      setError('Could not create expert');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Link
        to="/app/experts"
        className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Experts
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-medium tracking-tight text-ink-900">
            Setup Expert Profile
          </h1>
          <p className="text-ink-500 mt-2">This creates the expert and starts onboarding emails.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary" onClick={() => navigate('/app/experts')}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={save}
            disabled={isSaving || !name || !roleTitle || !email}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>

      {error ? <div className="card text-red-600">{error}</div> : null}

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
          Profile basics
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-ink-200"
          placeholder="Full Name"
        />
        <input
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-ink-200"
          placeholder="Role / Title"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-ink-200"
          placeholder="Email Address"
        />
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value as typeof domain)}
          className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white"
        >
          <option value="business">Business</option>
          <option value="medical">Medical</option>
          <option value="legal">Legal</option>
          <option value="education">Education</option>
        </select>
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
          Public source links
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="url"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-ink-200"
            placeholder="https://example.com/article"
          />
          <button type="button" className="btn-secondary" onClick={addUrl}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </button>
        </div>
        {urls.length === 0 ? (
          <p className="text-sm text-ink-500">No URLs added. You can still continue.</p>
        ) : (
          <div className="space-y-2">
            {urls.map((url) => (
              <div
                key={url}
                className="p-3 bg-beige-50 rounded-xl text-sm flex items-center justify-between"
              >
                <span className="truncate pr-4">{url}</span>
                <button
                  type="button"
                  onClick={() => setUrls((current) => current.filter((item) => item !== url))}
                >
                  <X className="w-4 h-4 text-ink-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
