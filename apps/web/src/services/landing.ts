// PATH: apps/web/src/services/landing.ts
// WHAT: Public landing request API adapter for beta access form
// WHY:  Moves landing endpoint contract outside the page component
// RELEVANT: apps/web/src/pages/Landing.tsx,services/api/src/routes/landing-requests.ts

import { apiRequest } from './api/client';

export type LandingRequestInput = {
  name: string;
  email: string;
  company?: string;
  message?: string;
};

export const submitLandingRequest = async (input: LandingRequestInput): Promise<void> => {
  await apiRequest<{ ok: true }>('/api/v1/landing/requests', {
    method: 'POST',
    body: {
      name: input.name,
      email: input.email,
      company: input.company ?? '',
      message: input.message ?? '',
    },
  });
};
