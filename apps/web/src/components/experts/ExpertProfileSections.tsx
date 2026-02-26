// PATH: apps/web/src/components/experts/ExpertProfileSections.tsx
// WHAT: Секции профиля эксперта: summary, samples, onboarding, authored drafts
// WHY:  FR-031 — держит страницу профиля компактной и читаемой
// RELEVANT: apps/web/src/pages/ExpertDetailPage.tsx,apps/web/src/services/api.ts

import type { ExpertDetail, OnboardingStep } from '../../services/api';
import type { DraftCard } from '../../services/editorial-types';
import { Link } from 'react-router-dom';

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
    <section className="expert-profile-grid">
      <article className="card expert-profile-main">
        <h3>Voice profile summary</h3>
        <p>
          <strong>Tone:</strong> {props.tone}
        </p>
        <p>
          <strong>Dos:</strong> {props.dos.length ? props.dos.join(', ') : 'Not set yet'}
        </p>
        <p>
          <strong>Donts:</strong> {props.donts.length ? props.donts.join(', ') : 'Not set yet'}
        </p>
      </article>

      <article className="card expert-profile-main">
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

      <article className="card expert-profile-main">
        <h3>Authored drafts</h3>
        {props.drafts.length ? (
          <ul>
            {props.drafts.map((draft) => (
              <li key={draft.id}>
                <Link to={`/drafts/${draft.id}`}>{draft.topic?.title ?? 'Untitled draft'}</Link> ·{' '}
                {draft.status}
              </li>
            ))}
          </ul>
        ) : (
          <p>No authored drafts yet.</p>
        )}
      </article>

      <article className="card expert-profile-side">
        <h3>Onboarding checklist</h3>
        <p style={{ marginTop: 0 }}>Voice profile: {props.expert.voiceProfileStatus}</p>
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
    </section>
  );
}
