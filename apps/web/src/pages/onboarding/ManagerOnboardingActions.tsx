// PATH: apps/web/src/pages/onboarding/ManagerOnboardingActions.tsx
// WHAT: CTA row for manager onboarding step actions
// WHY:  Keeps page component focused on loading and step state
// RELEVANT: apps/web/src/pages/ManagerOnboarding.tsx,apps/web/src/services/onboarding.ts

import { Link, useNavigate } from 'react-router-dom';
import type { OnboardingStep } from '../../services/onboarding';

type Props = {
  actionLabel: string;
  actionPath?: string;
  nextStep: OnboardingStep | null;
  saving: boolean;
  step: OnboardingStep;
  onChange: (
    status: 'in_progress' | 'skipped' | 'completed',
    step?: OnboardingStep,
  ) => Promise<void>;
  onAdvance: (step: OnboardingStep) => void;
};

export function ManagerOnboardingActions(props: Props) {
  const navigate = useNavigate();

  const handleContinue = async () => {
    if (!props.nextStep) return;
    await props.onChange('in_progress', props.nextStep);
    props.onAdvance(props.nextStep);
  };

  const handleComplete = async () => {
    await props.onChange('completed');
    navigate('/app', { replace: true });
  };

  const handleSkip = async () => {
    await props.onChange('skipped', props.step);
    navigate('/app', { replace: true });
  };

  return (
    <div className="flex flex-wrap gap-3">
      {props.actionPath ? (
        <Link to={props.actionPath} className="btn-secondary">
          {props.actionLabel}
        </Link>
      ) : null}
      {props.nextStep ? (
        <button
          className="btn-primary"
          disabled={props.saving}
          onClick={() => void handleContinue()}
        >
          {props.saving ? 'Saving...' : 'Continue'}
        </button>
      ) : (
        <button
          className="btn-primary"
          disabled={props.saving}
          onClick={() => void handleComplete()}
        >
          {props.saving ? 'Saving...' : 'Complete'}
        </button>
      )}
      <button className="btn-secondary" disabled={props.saving} onClick={() => void handleSkip()}>
        Skip for now
      </button>
    </div>
  );
}
