// PATH: apps/web/src/pages/ExpertDetailPage.tsx
// WHAT: Expert detail with onboarding step tracker and voice status
// WHY:  Allows managers to diagnose onboarding bottlenecks quickly
// RELEVANT: apps/web/src/pages/ExpertsPage.tsx,apps/web/src/services/api.ts

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, type ExpertDetail, type OnboardingStep } from '../services/api';

export const ExpertDetailPage = () => {
  const { id = '' } = useParams();
  const { token } = useAuth();
  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  useEffect(() => {
    if (!token || !id) return;
    apiClient.getExpert(token, id).then(setExpert).catch(() => undefined);
    apiClient.getExpertOnboarding(token, id).then((response) => setSteps(response.steps)).catch(() => undefined);
  }, [id, token]);

  if (!expert) return <p>Loading expert...</p>;

  return (
    <section className="card">
      <h2>{expert.name}</h2>
      <p>{expert.roleTitle}</p>
      <p>Status: {expert.status}</p>
      <p>Voice profile: {expert.voiceProfileStatus}</p>
      <h3>Onboarding</h3>
      <ol>
        {steps.map((step) => (
          <li key={step.stepNumber}>Step {step.stepNumber}: {step.status}</li>
        ))}
      </ol>
      <p>Voice test: {expert.status === 'voice_testing' ? 'sent for rating' : 'not sent yet'}</p>
    </section>
  );
};
