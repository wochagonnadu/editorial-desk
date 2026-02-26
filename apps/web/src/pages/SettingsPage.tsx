// PATH: apps/web/src/pages/SettingsPage.tsx
// WHAT: Owner-only settings page mapped to currently available backend capabilities
// WHY:  Shows what is real today and hides fake controls until API support exists
// RELEVANT: apps/web/src/App.tsx,apps/web/src/services/api.ts

import { useEffect, useState } from 'react';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { apiClient, type ExpertListItem } from '../services/api';

interface CompanyMe {
  id: string;
  name: string;
  domain: string;
  language: string;
}

const SettingsPage = () => {
  const { token } = useAuth();
  const [company, setCompany] = useState<CompanyMe | null>(null);
  const [experts, setExperts] = useState<ExpertListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([apiClient.getCompanyMe(token), apiClient.getExperts(token)])
      .then(([companyData, expertData]) => {
        setCompany(companyData);
        setExperts(expertData.data);
      })
      .catch(() => setNote('Could not load settings data.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) return null;
  if (loading) return <Skeleton variant="list" />;
  if (!company) return <EmptyState message="Settings are not available right now" />;

  return (
    <section className="experts-page">
      <header>
        <h1 style={{ marginBottom: 'var(--space-1)' }}>Settings</h1>
        <p className="experts-subtitle">Owner-only workspace settings with live backend mapping.</p>
      </header>
      {note ? <p className="draft-editor-note">{note}</p> : null}

      <article className="card">
        <h3>Team (live)</h3>
        <small>Source: `GET /experts`</small>
        {experts.length ? (
          <ul>
            {experts.map((expert) => (
              <li key={expert.id}>
                {expert.name} - {expert.roleTitle} ({expert.voiceProfileStatus})
              </li>
            ))}
          </ul>
        ) : (
          <p>No experts in workspace yet.</p>
        )}
      </article>

      <article className="card">
        <h3>Workspace Defaults (live, read-only)</h3>
        <small>Source: `GET /companies/me`</small>
        <p>Name: {company.name}</p>
        <p>Domain: {company.domain}</p>
        <p>Language: {company.language}</p>
      </article>

      <article className="card">
        <h3>Billing (not available yet)</h3>
        <p>Billing API is not exposed in current backend. Keep this section informational.</p>
      </article>

      <article className="card">
        <h3>Notifications (not available yet)</h3>
        <p>User notification preferences API is not exposed yet. No fake toggles shown.</p>
      </article>
    </section>
  );
};

export default SettingsPage;
