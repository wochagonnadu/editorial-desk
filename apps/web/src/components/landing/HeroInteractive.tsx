// PATH: apps/web/src/components/landing/HeroInteractive.tsx
// WHAT: Interactive hero switcher for landing value pillars
// WHY:  Gives storyscrolling feel without pulling extra animation dependencies
// RELEVANT: apps/web/src/pages/LandingPage.tsx,apps/web/src/styles/landing.css

import { useState } from 'react';

const PILLARS = [
  {
    key: 'speed',
    title: 'Publish 3x faster',
    text: 'Automate first-draft generation and keep editors focused on message quality.',
  },
  {
    key: 'quality',
    title: 'Stronger factual confidence',
    text: 'Track factcheck outcomes and approvals in one editorial pipeline view.',
  },
  {
    key: 'control',
    title: 'Clear ownership',
    text: 'See who is blocking review, send reminders, and keep deadlines visible.',
  },
] as const;

export function HeroInteractive() {
  const [activeKey, setActiveKey] = useState<(typeof PILLARS)[number]['key']>('speed');
  const active = PILLARS.find((item) => item.key === activeKey) ?? PILLARS[0];

  return (
    <section className="landing-hero card">
      <small className="landing-kicker">Virtual Newsroom</small>
      <h1>{active.title}</h1>
      <p>{active.text}</p>
      <div className="landing-pillars">
        {PILLARS.map((pillar) => (
          <button
            key={pillar.key}
            className={activeKey === pillar.key ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveKey(pillar.key)}
          >
            {pillar.title}
          </button>
        ))}
      </div>
    </section>
  );
}
