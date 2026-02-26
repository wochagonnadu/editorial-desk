// PATH: apps/web/src/components/landing/WorkflowInteractive.tsx
// WHAT: Clickable workflow steps for landing page story section
// WHY:  Shows end-to-end editorial flow in a compact interactive block
// RELEVANT: apps/web/src/pages/LandingPage.tsx,apps/web/src/styles/landing.css

import { useState } from 'react';

const STEPS = [
  {
    key: 'topic',
    label: 'Topic approved',
    detail: 'Manager approves topic and assigns expert context.',
  },
  {
    key: 'draft',
    label: 'Draft generated',
    detail: 'AI drafts initial version with voice profile constraints.',
  },
  {
    key: 'factcheck',
    label: 'Factcheck pass',
    detail: 'Claims are verified before review starts.',
  },
  {
    key: 'approval',
    label: 'Review + approval',
    detail: 'Reviewer flow runs with reminders and forwarding.',
  },
] as const;

export function WorkflowInteractive() {
  const [active, setActive] = useState<(typeof STEPS)[number]['key']>('topic');
  const step = STEPS.find((item) => item.key === active) ?? STEPS[0];

  return (
    <section className="card landing-workflow">
      <h2>How the flow works</h2>
      <div className="landing-step-list">
        {STEPS.map((item, index) => (
          <button
            key={item.key}
            className={item.key === active ? 'landing-step landing-step--active' : 'landing-step'}
            onClick={() => setActive(item.key)}
          >
            <strong>
              {index + 1}. {item.label}
            </strong>
          </button>
        ))}
      </div>
      <p className="landing-step-detail">{step.detail}</p>
    </section>
  );
}
