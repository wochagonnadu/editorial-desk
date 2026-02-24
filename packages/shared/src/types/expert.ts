// PATH: packages/shared/src/types/expert.ts
// WHAT: Expert voice onboarding and profile types
// WHY:  Captures expert lifecycle and voice calibration entities
// RELEVANT: packages/shared/src/types/company-user.ts,packages/shared/src/types/topic-draft.ts

import type { CompanyDomain } from './company-user';
import type { EntityId, ISODateTime } from './common';

export type ExpertStatus = 'pending' | 'onboarding' | 'voice_testing' | 'active' | 'inactive';
export type VoiceProfileStatus = 'draft' | 'confirmed';
export type OnboardingStepStatus = 'pending' | 'sent' | 'replied' | 'skipped';

export interface Expert {
  id: EntityId;
  companyId: EntityId;
  name: string;
  roleTitle: string;
  email: string;
  domain: CompanyDomain;
  publicTextUrls: string[];
  status: ExpertStatus;
  createdAt: ISODateTime;
}

export interface VoiceProfile {
  id: EntityId;
  expertId: EntityId;
  status: VoiceProfileStatus;
  profileData: Record<string, unknown>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OnboardingSequence {
  id: EntityId;
  expertId: EntityId;
  stepNumber: number;
  status: OnboardingStepStatus;
  reminderCount: number;
  sentAt?: ISODateTime;
  repliedAt?: ISODateTime;
}
