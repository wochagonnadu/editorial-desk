// PATH: services/api/src/providers/llm/policy.ts
// WHAT: Runtime policy matrix for LLM gateway use cases
// WHY:  Keeps timeout/retry/fallback behavior predictable
// RELEVANT: services/api/src/providers/llm/gateway.ts,specs/015-llm-gateway-foundation/artifacts/phase-c-runtime-policy.md

import type { LLMUseCase } from './contracts.js';

export interface UseCasePolicy {
  timeoutMs: number;
  retryMax: number;
  requiresVoiceProfile: boolean;
  primaryModelEnv: string;
  fallbackModelEnv: string;
}

export const useCasePolicy: Record<LLMUseCase, UseCasePolicy> = {
  'draft.generate': {
    timeoutMs: 45_000,
    retryMax: 3,
    requiresVoiceProfile: true,
    primaryModelEnv: 'OPENROUTER_GENERATE_MODEL',
    fallbackModelEnv: 'LLM_FALLBACK_DRAFT_GENERATE_MODEL',
  },
  'draft.revise': {
    timeoutMs: 45_000,
    retryMax: 3,
    requiresVoiceProfile: true,
    primaryModelEnv: 'OPENROUTER_REVISE_MODEL',
    fallbackModelEnv: 'LLM_FALLBACK_DRAFT_REVISE_MODEL',
  },
  'factcheck.extract': {
    timeoutMs: 20_000,
    retryMax: 3,
    requiresVoiceProfile: false,
    primaryModelEnv: 'OPENROUTER_EXTRACT_MODEL',
    fallbackModelEnv: 'LLM_FALLBACK_FACTCHECK_EXTRACT_MODEL',
  },
  'factcheck.verify': {
    timeoutMs: 20_000,
    retryMax: 3,
    requiresVoiceProfile: false,
    primaryModelEnv: 'OPENROUTER_VERIFY_MODEL',
    fallbackModelEnv: 'LLM_FALLBACK_FACTCHECK_VERIFY_MODEL',
  },
  'topics.suggest': {
    timeoutMs: 20_000,
    retryMax: 2,
    requiresVoiceProfile: false,
    primaryModelEnv: 'OPENROUTER_EXTRACT_MODEL',
    fallbackModelEnv: 'LLM_FALLBACK_TOPICS_SUGGEST_MODEL',
  },
  'expert.voice.synthesize': {
    timeoutMs: 25_000,
    retryMax: 2,
    requiresVoiceProfile: false,
    primaryModelEnv: 'OPENROUTER_VOICE_SYNTH_MODEL',
    fallbackModelEnv: 'LLM_FALLBACK_VOICE_SYNTH_MODEL',
  },
};
