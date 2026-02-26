// PATH: apps/web/src/components/landing/TeamCarousel.tsx
// WHAT: Small manual carousel for testimonial-like team outcomes
// WHY:  Adds interactive social proof without heavy animation runtime
// RELEVANT: apps/web/src/pages/LandingPage.tsx,apps/web/src/styles/landing.css

import { useState } from 'react';

const CARDS = [
  { team: 'Growth Team', quote: 'We moved from weekly chaos to predictable publishing rhythm.' },
  { team: 'Editorial Ops', quote: 'Approvals are visible now. We spot blockers in minutes.' },
  { team: 'Founder Desk', quote: 'Experts stay in voice and we still publish fast.' },
] as const;

export function TeamCarousel() {
  const [index, setIndex] = useState(0);
  const current = CARDS[index] ?? CARDS[0];

  return (
    <section className="card landing-carousel">
      <h2>Trusted by lean editorial teams</h2>
      <blockquote>"{current.quote}"</blockquote>
      <small>{current.team}</small>
      <div className="row">
        <button
          className="btn-secondary"
          onClick={() => setIndex((prev) => (prev === 0 ? CARDS.length - 1 : prev - 1))}
        >
          Previous
        </button>
        <button
          className="btn-secondary"
          onClick={() => setIndex((prev) => (prev === CARDS.length - 1 ? 0 : prev + 1))}
        >
          Next
        </button>
      </div>
    </section>
  );
}
