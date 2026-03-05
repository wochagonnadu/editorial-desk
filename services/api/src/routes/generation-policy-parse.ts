// PATH: services/api/src/routes/generation-policy-parse.ts
// WHAT: Validation parser for partial generation_policy PATCH payload
// WHY:  Keeps request validation strict and route-level errors predictable
// RELEVANT: services/api/src/routes/company-patch.ts,services/api/src/routes/generation-policy.ts

import { AppError } from '../core/errors.js';
import type { GenerationPolicyPatch } from './generation-policy.js';

type GenerationAudience = 'general' | 'beginners' | 'practitioners';

const AUDIENCES = new Set<GenerationAudience>(['general', 'beginners', 'practitioners']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseList = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value)) throw new AppError(400, 'VALIDATION_ERROR', `${field} must be array`);
  if (value.length > 12) throw new AppError(400, 'VALIDATION_ERROR', `${field} max 12 items`);
  return value.map((item, index) => {
    if (typeof item !== 'string' || item.trim().length < 2 || item.trim().length > 80) {
      throw new AppError(400, 'VALIDATION_ERROR', `${field}[${index}] must be 2..80 chars`);
    }
    return item.trim();
  });
};

export const parseGenerationPolicyPatch = (value: unknown): GenerationPolicyPatch | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value))
    throw new AppError(400, 'VALIDATION_ERROR', 'generation_policy must be object');
  const patch: GenerationPolicyPatch = {};
  if (value.tone !== undefined) {
    if (
      typeof value.tone !== 'string' ||
      value.tone.trim().length < 10 ||
      value.tone.trim().length > 240
    ) {
      throw new AppError(400, 'VALIDATION_ERROR', 'generation_policy.tone must be 10..240 chars');
    }
    patch.tone = value.tone.trim();
  }
  if (value.default_audience !== undefined) {
    if (
      typeof value.default_audience !== 'string' ||
      !AUDIENCES.has(value.default_audience as GenerationAudience)
    ) {
      throw new AppError(400, 'VALIDATION_ERROR', 'generation_policy.default_audience invalid');
    }
    patch.default_audience = value.default_audience as GenerationAudience;
  }
  if (value.guardrails !== undefined) {
    if (!isRecord(value.guardrails)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'generation_policy.guardrails must be object');
    }
    const guardrails: NonNullable<GenerationPolicyPatch['guardrails']> = {};
    if (value.guardrails.must_include !== undefined) {
      guardrails.must_include = parseList(
        value.guardrails.must_include,
        'generation_policy.guardrails.must_include',
      );
    }
    if (value.guardrails.avoid !== undefined) {
      guardrails.avoid = parseList(value.guardrails.avoid, 'generation_policy.guardrails.avoid');
    }
    if (value.guardrails.banned_phrases !== undefined) {
      guardrails.banned_phrases = parseList(
        value.guardrails.banned_phrases,
        'generation_policy.guardrails.banned_phrases',
      );
    }
    if (Object.keys(guardrails).length === 0) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'generation_policy.guardrails requires at least one field',
      );
    }
    patch.guardrails = guardrails;
  }
  if (Object.keys(patch).length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'generation_policy requires at least one field');
  }
  return patch;
};
