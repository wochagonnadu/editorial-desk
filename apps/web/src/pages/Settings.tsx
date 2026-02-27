// PATH: apps/web/src/pages/Settings.tsx
// WHAT: Settings screen wired to company and experts read APIs
// WHY:  Replaces static settings mocks with live workspace and team data
// RELEVANT: apps/web/src/services/company.ts,apps/web/src/services/experts.ts

import { useEffect, useState } from 'react';
import { Save, Users } from 'lucide-react';
import { fetchCompanySettings, type CompanySettings } from '../services/company';
import { fetchExperts, type ExpertItem } from '../services/experts';
import { useSession } from '../services/session';

export function Settings() {
  const { session } = useSession();
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [team, setTeam] = useState<ExpertItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        setError(null);
        const [companyData, teamData] = await Promise.all([
          fetchCompanySettings(session.token),
          fetchExperts(session.token),
        ]);
        setCompany(companyData);
        setTeam(teamData);
      } catch {
        setError('Could not load settings');
      }
    };
    void load();
  }, [session]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Settings</h1>
          <p className="text-ink-500 mt-1">Manage your newsroom preferences.</p>
        </div>
        <button className="btn-primary" disabled>
          <Save className="w-4 h-4 mr-2" /> Save changes
        </button>
      </header>

      {error ? <div className="card text-red-600">{error}</div> : null}

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
          Workspace Settings
        </h2>
        {!company ? (
          <p className="text-sm text-ink-500">Loading workspace...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-ink-500">Workspace Name</p>
              <p className="font-medium text-ink-900">{company.name}</p>
            </div>
            <div>
              <p className="text-ink-500">Domain</p>
              <p className="font-medium text-ink-900">{company.domain}</p>
            </div>
            <div>
              <p className="text-ink-500">Language</p>
              <p className="font-medium text-ink-900">{company.language}</p>
            </div>
          </div>
        )}
        <p className="text-xs text-ink-400">
          Write API for workspace settings is not in this phase scope.
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
          Team Management
        </h2>
        {team.length === 0 ? (
          <p className="text-sm text-ink-500">No experts found.</p>
        ) : (
          <div className="space-y-3">
            {team.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-white border border-ink-100 rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center text-ink-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-ink-900">{member.name}</p>
                    <p className="text-sm text-ink-500">{member.email}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-ink-500 bg-beige-50 px-3 py-1 rounded-lg border border-ink-100">
                  {member.roleTitle}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
