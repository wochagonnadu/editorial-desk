// PATH: apps/web/src/pages/ExpertSetup.tsx
// WHAT: Expert setup form wired to create + rich profile save contracts
// WHY:  Persists full expert context for predictable generation input
// RELEVANT: apps/web/src/pages/Experts.tsx,apps/web/src/services/experts.ts

import { useState } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../services/api/client';
import { createExpert, saveExpertProfile } from '../services/experts';
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
  const [tonePrimary, setTonePrimary] = useState('direct');
  const [telegram, setTelegram] = useState('');
  const [website, setWebsite] = useState('');
  const [background, setBackground] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addUrl = () => {
    if (!urlInput.trim()) return;
    setUrls((current) => [...current, urlInput.trim()]);
    setUrlInput('');
  };

  const addTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    setTags((current) => (current.includes(next) ? current : [...current, next]));
    setTagInput('');
  };

  const save = async () => {
    if (!session) return;
    try {
      setError(null);
      setNotice(null);
      setIsSaving(true);
      const id = await createExpert(session.token, {
        name,
        roleTitle,
        email,
        domain,
        publicTextUrls: urls,
      });
      await saveExpertProfile(session.token, id, {
        role: roleTitle.trim(),
        tone: {
          primary: tonePrimary.trim(),
          secondary: [],
        },
        contacts: {
          email: email.trim(),
          ...(telegram.trim() ? { telegram: telegram.trim() } : {}),
          ...(website.trim() ? { website: website.trim() } : {}),
        },
        tags,
        sources: urls,
        background,
      });
      setNotice('Expert profile saved');
      navigate(`/app/experts/${id}`, { replace: true });
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message);
      } else {
        setError('Could not save expert profile');
      }
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

      {notice ? <div className="card text-green-700">{notice}</div> : null}
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
          id="tone-primary"
          value={tonePrimary}
          onChange={(e) => setTonePrimary(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white"
        >
          <option value="direct">Direct</option>
          <option value="calm">Calm</option>
          <option value="warm">Warm</option>
          <option value="clinical">Clinical</option>
        </select>
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
          Voice context
        </h2>
        <textarea
          value={background}
          onChange={(event) => setBackground(event.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-ink-200 min-h-[100px]"
          placeholder="Short background for generation context"
        />
        <div className="flex items-center gap-3">
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-ink-200"
            placeholder="Add tag"
          />
          <button type="button" className="btn-secondary" onClick={addTag}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </button>
        </div>
        {tags.length === 0 ? (
          <p className="text-sm text-ink-500">No tags added yet.</p>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag}
                className="p-3 bg-beige-50 rounded-xl text-sm flex items-center justify-between"
              >
                <span className="truncate pr-4">{tag}</span>
                <button
                  type="button"
                  onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                >
                  <X className="w-4 h-4 text-ink-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">Contacts</h2>
        <input
          value={telegram}
          onChange={(event) => setTelegram(event.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-ink-200"
          placeholder="Telegram handle (optional)"
        />
        <input
          type="url"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-ink-200"
          placeholder="Website URL (optional)"
        />
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

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">Domain</h2>
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
    </div>
  );
}
