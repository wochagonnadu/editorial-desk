// PATH: services/api/src/providers/llm/contracts.ts
// WHAT: Prompt registry and runtime policy for LLM gateway
// WHY:  Keeps model routing and prompt versions centralized
// RELEVANT: services/api/src/providers/llm/gateway.ts,specs/015-llm-gateway-foundation/artifacts/phase-d-baseline-prompts.md

import type { ContentObjectInput, ContentTextInput } from '@newsroom/shared';
import {
  DRAFT_GENERATE_SYSTEM,
  DRAFT_GENERATE_USER,
  DRAFT_REVISE_SYSTEM,
  DRAFT_REVISE_USER,
} from './prompts/draft.js';
import {
  FACTCHECK_EXTRACT_SYSTEM,
  FACTCHECK_EXTRACT_USER,
  FACTCHECK_VERIFY_SYSTEM,
  FACTCHECK_VERIFY_USER,
} from './prompts/factcheck.js';
import {
  CONTENT_STRATEGY_12W_SYSTEM,
  CONTENT_STRATEGY_12W_USER,
  TOPICS_SUGGEST_SYSTEM,
  TOPICS_SUGGEST_USER,
} from './prompts/topics.js';
import {
  VOICE_SYNTH_SYSTEM,
  VOICE_SYNTH_USER,
  VOICE_TEST_GENERATE_SYSTEM,
  VOICE_TEST_GENERATE_USER,
} from './prompts/voice.js';

type PromptMeta = NonNullable<ContentTextInput['meta'] | ContentObjectInput['meta']>;
type UseCase = PromptMeta['useCase'];

export interface PromptTemplate {
  promptId: string;
  promptVersion: `${number}.${number}.${number}`;
  system?: string;
  user: string;
  requiredVars: string[];
}

export const promptRegistry: Record<string, PromptTemplate> = {
  'drafts.generate.base@1.0.0': {
    promptId: 'drafts.generate.base',
    promptVersion: '1.0.0',
    system: DRAFT_GENERATE_SYSTEM,
    user: DRAFT_GENERATE_USER,
    requiredVars: [
      'topic_title',
      'expert_name',
      'voice_profile_json',
      'audience',
      'company_editorial_context',
      'workspace_generation_policy_json',
    ],
  },
  'drafts.revise.base@1.0.0': {
    promptId: 'drafts.revise.base',
    promptVersion: '1.0.0',
    system: DRAFT_REVISE_SYSTEM,
    user: DRAFT_REVISE_USER,
    requiredVars: [
      'instructions',
      'draft_content',
      'company_editorial_context',
      'voice_profile_json',
      'workspace_generation_policy_json',
    ],
  },
  'factcheck.extract.claims@1.0.0': {
    promptId: 'factcheck.extract.claims',
    promptVersion: '1.0.0',
    system: FACTCHECK_EXTRACT_SYSTEM,
    user: FACTCHECK_EXTRACT_USER,
    requiredVars: ['draft_content'],
  },
  'factcheck.verify.high_risk@1.0.0': {
    promptId: 'factcheck.verify.high_risk',
    promptVersion: '1.0.0',
    system: FACTCHECK_VERIFY_SYSTEM,
    user: FACTCHECK_VERIFY_USER,
    requiredVars: ['claims_json'],
  },
  'topics.suggest.weekly@1.0.0': {
    promptId: 'topics.suggest.weekly',
    promptVersion: '1.0.0',
    system: TOPICS_SUGGEST_SYSTEM,
    user: TOPICS_SUGGEST_USER,
    requiredVars: ['company_name', 'company_domain', 'experts_json'],
  },
  'content.strategy.12w@1.0.0': {
    promptId: 'content.strategy.12w',
    promptVersion: '1.0.0',
    system: CONTENT_STRATEGY_12W_SYSTEM,
    user: CONTENT_STRATEGY_12W_USER,
    requiredVars: ['topic_seed', 'expert_name', 'audience', 'market', 'constraints_json'],
  },
  'expert.voice.synthesize.base@1.0.0': {
    promptId: 'expert.voice.synthesize.base',
    promptVersion: '1.0.0',
    system: VOICE_SYNTH_SYSTEM,
    user: VOICE_SYNTH_USER,
    requiredVars: [
      'onboarding_replies_json',
      'public_text_urls_json',
      'public_text_samples_json',
      'expert_edit_diffs_json',
      'domain',
    ],
  },
  'expert.voice.test.generate.base@1.0.0': {
    promptId: 'expert.voice.test.generate.base',
    promptVersion: '1.0.0',
    system: VOICE_TEST_GENERATE_SYSTEM,
    user: VOICE_TEST_GENERATE_USER,
    requiredVars: [
      'expert_name',
      'domain',
      'voice_profile_json',
      'onboarding_replies_json',
      'public_text_urls_json',
    ],
  },
};

export const lookupPrompt = (meta: PromptMeta) => {
  return promptRegistry[`${meta.promptId}@${meta.promptVersion}`];
};

export type LLMUseCase = UseCase;
