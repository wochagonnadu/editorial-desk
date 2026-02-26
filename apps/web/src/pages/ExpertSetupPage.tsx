// PATH: apps/web/src/pages/ExpertSetupPage.tsx
// WHAT: Dedicated setup flow for creating experts with onboarding source links
// WHY:  Separates setup from list screen and maps inputs to real create endpoint
// RELEVANT: apps/web/src/components/experts/ExpertSetupForm.tsx,apps/web/src/services/api.ts

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExpertSetupForm } from '../components/experts/ExpertSetupForm';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

export const ExpertSetupPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  if (!token) return null;

  return (
    <section className="experts-page" style={{ gap: 'var(--space-4)' }}>
      <Link to="/experts" className="btn-secondary" style={{ justifySelf: 'start' }}>
        Back to experts
      </Link>

      <header>
        <h1 style={{ marginBottom: 'var(--space-1)' }}>New Expert Setup</h1>
        <p className="experts-subtitle">
          MVP scope: basic profile + public source URLs. Tags and file upload stay out of this
          phase.
        </p>
      </header>

      {note ? <p className="draft-editor-note">{note}</p> : null}

      <ExpertSetupForm
        saving={saving}
        onSubmit={async (payload) => {
          setSaving(true);
          setNote('');
          try {
            const created = await apiClient.createExpert(token, payload);
            navigate(`/experts/${created.id}`);
          } catch (caught) {
            setNote(caught instanceof Error ? caught.message : 'Could not create expert');
          } finally {
            setSaving(false);
          }
        }}
      />
    </section>
  );
};
