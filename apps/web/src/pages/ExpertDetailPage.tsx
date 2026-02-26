// PATH: apps/web/src/pages/ExpertDetailPage.tsx
// WHAT: Expert profile with voice summary, samples, onboarding and authored drafts
// WHY:  FR-031 — менеджер видит полный профиль эксперта и его контент
// RELEVANT: apps/web/src/services/api.ts,apps/web/src/services/editorial-api.ts

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { ExpertProfileSections } from '../components/experts/ExpertProfileSections';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { apiClient, type ExpertDetail, type OnboardingStep } from '../services/api';
import { editorialApi } from '../services/editorial-api';
import type { DraftCard } from '../services/editorial-types';

const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter(Boolean) : [];

export const ExpertDetailPage = () => {
  const { id = '' } = useParams();
  const { token } = useAuth();
  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [drafts, setDrafts] = useState<DraftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    Promise.all([
      apiClient.getExpert(token, id),
      apiClient.getExpertOnboarding(token, id).then((response) => response.steps),
      editorialApi.getDrafts(token, { expertId: id }).then((response) => response.data),
    ])
      .then(([nextExpert, nextSteps, authored]) => {
        setExpert(nextExpert);
        setSteps(nextSteps);
        setDrafts(authored);
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  const tone = useMemo(() => String(expert?.voiceProfileData?.tone ?? 'Not set yet'), [expert]);
  const dos = useMemo(() => asList(expert?.voiceProfileData?.dos), [expert]);
  const donts = useMemo(() => asList(expert?.voiceProfileData?.donts), [expert]);

  if (loading) return <Skeleton variant="list" />;
  if (!expert) return <EmptyState message="Expert profile not found" />;

  return (
    <section className="experts-page" style={{ gap: 'var(--space-4)' }}>
      <Link to="/experts" className="btn-secondary" style={{ justifySelf: 'start' }}>
        Back to experts
      </Link>

      <header className="experts-header">
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>{expert.name}</h1>
          <p className="experts-subtitle">{expert.roleTitle}</p>
        </div>

        <button
          className="btn-secondary"
          onClick={async () => {
            if (!token) return;
            await editorialApi.pingExpert(token, expert.id);
            setNote('Request 2 minutes sent.');
          }}
        >
          Request 2 minutes
        </button>
      </header>

      {note ? <p className="draft-editor-note">{note}</p> : null}

      <ExpertProfileSections
        expert={expert}
        steps={steps}
        drafts={drafts}
        tone={tone}
        dos={dos}
        donts={donts}
      />
    </section>
  );
};
