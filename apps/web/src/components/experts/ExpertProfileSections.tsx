// PATH: apps/web/src/components/experts/ExpertProfileSections.tsx
// WHAT: Секции профиля эксперта: summary, samples, onboarding, authored drafts
// WHY:  FR-031 — держит страницу профиля компактной и читаемой
// RELEVANT: apps/web/src/pages/ExpertDetailPage.tsx,apps/web/src/services/api.ts

import type { ExpertDetail, OnboardingStep } from '../../services/api';
import type { DraftCard } from '../../services/editorial-types';

interface ExpertProfileSectionsProps {
  expert: ExpertDetail;
  steps: OnboardingStep[];
  drafts: DraftCard[];
  tone: string;
  dos: string[];
  donts: string[];
}

export function ExpertProfileSections(props: ExpertProfileSectionsProps) {
  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <article className="card">
        <h2>{props.expert.name}</h2>
        <p>{props.expert.roleTitle}</p>
        <p>Voice profile: {props.expert.voiceProfileStatus}</p>
      </article>
      <article className="card">
        <h3>Voice profile summary</h3>
        <p>Tone: {props.tone}</p>
        <p>Dos: {props.dos.length ? props.dos.join(', ') : 'Not set yet'}</p>
        <p>Donts: {props.donts.length ? props.donts.join(', ') : 'Not set yet'}</p>
      </article>
      <article className="card">
        <h3>Source samples</h3>
        {props.expert.publicTextUrls.length ? (
          <ul>
            {props.expert.publicTextUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No source samples linked yet.</p>
        )}
      </article>
      <article className="card">
        <h3>Onboarding checklist</h3>
        {props.steps.length ? (
          <ol>
            {props.steps.map((step) => (
              <li key={step.stepNumber}>
                Step {step.stepNumber}: {step.status}
              </li>
            ))}
          </ol>
        ) : (
          <p>No onboarding steps yet.</p>
        )}
      </article>
      <article className="card">
        <h3>Authored content</h3>
        {props.drafts.length ? (
          <ul>
            {props.drafts.map((draft) => (
              <li key={draft.id}>
                {draft.topic?.title ?? 'Untitled'} · {draft.status}
              </li>
            ))}
          </ul>
        ) : (
          <p>No authored drafts yet.</p>
        )}
      </article>
    </section>
  );
}
