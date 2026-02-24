// PATH: apps/web/src/pages/ExpertsPage.tsx
// WHAT: Experts list with onboarding progress and status badges
// WHY:  Gives managers operational visibility over voice onboarding
// RELEVANT: apps/web/src/components/AddExpertForm.tsx,apps/web/src/services/api.ts

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AddExpertForm } from '../components/AddExpertForm';
import { useAuth } from '../context/AuthContext';
import { apiClient, type ExpertListItem } from '../services/api';

export const ExpertsPage = () => {
  const { token } = useAuth();
  const [experts, setExperts] = useState<ExpertListItem[]>([]);

  const load = async () => {
    if (!token) return;
    const response = await apiClient.getExperts(token);
    setExperts(response.data);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);

  if (!token) return null;

  return (
    <section>
      <AddExpertForm onSubmit={async (payload) => { await apiClient.createExpert(token, payload); await load(); }} />
      <div className="list">
        {experts.map((expert) => (
          <article className="card" key={expert.id}>
            <h3><Link to={`/experts/${expert.id}`}>{expert.name}</Link></h3>
            <p>{expert.roleTitle}</p>
            <p>Status: {expert.status}</p>
            <p>Voice profile: {expert.voiceProfileStatus}</p>
            <div className="progress"><span style={{ width: `${(expert.onboardingProgress / 5) * 100}%` }} /></div>
          </article>
        ))}
      </div>
    </section>
  );
};
