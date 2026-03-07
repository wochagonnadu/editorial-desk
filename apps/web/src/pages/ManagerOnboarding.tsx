// PATH: apps/web/src/pages/ManagerOnboarding.tsx
// WHAT: Dedicated first-run surface for manager onboarding steps
// WHY:  Prevents managers from landing in an empty app shell on first entry
// RELEVANT: apps/web/src/pages/onboarding/manager-onboarding-steps.ts,apps/web/src/services/onboarding.ts

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSetupStatus } from '../services/user';
import { useSession } from '../services/session';
import {
  fetchOnboardingState,
  updateOnboardingState,
  type OnboardingStep,
} from '../services/onboarding';
import { ManagerOnboardingActions } from './onboarding/ManagerOnboardingActions';
import { managerOnboardingSteps, nextOnboardingStep } from './onboarding/manager-onboarding-steps';

export function ManagerOnboarding() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!session) return;
      if (!['owner', 'manager'].includes(session.user.role))
        return navigate('/app', { replace: true });
      try {
        const setup = await fetchSetupStatus(session.token);
        if (setup.setupRequired) return navigate('/app/setup', { replace: true });
        const state = await fetchOnboardingState(session.token);
        if (state.status === 'completed') return navigate('/app', { replace: true });
        setStep(state.status === 'not_started' ? 'welcome' : state.currentStep);
      } catch {
        setError('Could not load onboarding');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [navigate, session]);

  const current =
    managerOnboardingSteps.find((item) => item.id === step) ?? managerOnboardingSteps[0];
  const nextStep = nextOnboardingStep(step);

  const patchState = async (
    status: 'in_progress' | 'skipped' | 'completed',
    currentStep?: OnboardingStep,
  ) => {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      await updateOnboardingState(session.token, { status, current_step: currentStep });
    } catch {
      setError('Could not save onboarding progress');
      throw new Error('save_failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-beige-50 p-8">
        <div className="card">Loading onboarding...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-beige-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Manager onboarding tour</p>
          <h1 className="text-3xl font-serif text-ink-900">{current.title}</h1>
          <p className="text-ink-500">{current.body}</p>
          <div className="flex flex-wrap gap-3 text-sm text-ink-500">
            {managerOnboardingSteps.map((item, index) => (
              <span key={item.id} className={item.id === step ? 'text-ink-900 font-medium' : ''}>
                {index + 1}. {item.title}
              </span>
            ))}
          </div>
          {error ? <div className="card text-red-600">{error}</div> : null}
          <ManagerOnboardingActions
            actionLabel={current.actionLabel}
            actionPath={current.actionPath}
            nextStep={nextStep}
            saving={saving}
            step={step}
            onChange={patchState}
            onAdvance={setStep}
          />
        </div>
      </div>
    </div>
  );
}
