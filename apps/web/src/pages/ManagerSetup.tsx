// PATH: apps/web/src/pages/ManagerSetup.tsx
// WHAT: First-run setup screen for manager and company context before onboarding tour
// WHY:  Collects required editorial context before the user enters the product tour or app shell
// RELEVANT: apps/web/src/pages/setup/useManagerSetupState.ts,apps/web/src/services/first-run.ts,apps/web/src/services/company.ts

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveFirstRunPath } from '../services/first-run';
import { useSession } from '../services/session';
import { useManagerSetupState } from './setup/useManagerSetupState';

export function ManagerSetup() {
  const navigate = useNavigate();
  const { session } = useSession();
  const state = useManagerSetupState();

  useEffect(() => {
    if (!session || state.loading || state.setupRequired !== false) return;
    void resolveFirstRunPath(session.token).then((path) => navigate(path, { replace: true }));
  }, [navigate, session, state.loading, state.setupRequired]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-beige-50 p-8">
        <div className="card">Loading setup...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl card space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Manager setup</p>
          <h1 className="text-3xl font-serif text-ink-900">Set up your editorial workspace</h1>
          <p className="text-ink-500 mt-2">
            Add the context your newsroom needs before the onboarding tour starts.
          </p>
        </div>
        {state.error ? <div className="card text-red-600">{state.error}</div> : null}
        <form className="space-y-4" onSubmit={(event) => void state.handleSubmit(event)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <label className="space-y-1">
              <span className="text-ink-500">Manager name</span>
              <input
                value={state.managerName}
                onChange={(e) => state.setManagerName(e.target.value)}
                disabled={state.saving}
                className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-ink-500">Company name</span>
              <input
                value={state.companyName}
                onChange={(e) => state.setCompanyName(e.target.value)}
                disabled={state.saving}
                className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-ink-500">Company domain</span>
              <select
                value={state.companyDomain}
                onChange={(e) => state.setCompanyDomain(e.target.value)}
                disabled={state.saving}
                className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
              >
                <option value="medical">medical</option>
                <option value="legal">legal</option>
                <option value="education">education</option>
                <option value="business">business</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-ink-500">Editorial tone (optional)</span>
              <input
                value={state.editorialTone}
                onChange={(e) => state.setEditorialTone(e.target.value)}
                disabled={state.saving}
                placeholder="Calm, direct, practical"
                className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
              />
            </label>
          </div>
          <label className="space-y-1 block text-sm">
            <span className="text-ink-500">Company description</span>
            <textarea
              value={state.companyDescription}
              onChange={(e) => state.setCompanyDescription(e.target.value)}
              disabled={state.saving}
              rows={6}
              className="w-full px-3 py-2 rounded-2xl border border-ink-100 bg-white"
            />
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={state.saving} className="btn-primary">
              {state.saving ? 'Saving...' : 'Save and continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
