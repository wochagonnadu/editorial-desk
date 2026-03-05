// PATH: services/api/src/routes/expert-profile-validation.ts
// WHAT: Validation rules for expert rich profile PATCH payload
// WHY:  Enforces stable input contract before persisting profile data
// RELEVANT: services/api/src/routes/experts.ts,services/api/src/routes/expert-profile-contract.ts

import { AppError } from '../core/errors.js';
import { normalizeExpertRichProfile, type ExpertRichProfile } from './expert-profile-contract.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM_REGEX = /^@[A-Za-z0-9_]{3,32}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const validationError = (message: string, field: string): never => {
  throw new AppError(400, 'VALIDATION_ERROR', message, { field });
};

const requireObject = (value: unknown, field: string): Record<string, unknown> => {
  if (!isObject(value)) validationError(`${field} must be object`, field);
  return value as Record<string, unknown>;
};

const requireStringMax = (value: string, max: number, field: string) => {
  if (value.length > max) validationError(`${field} must be <= ${max} chars`, field);
};

const validateHttpsUrl = (value: string, field: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') validationError(`${field} must be https URL`, field);
  } catch {
    validationError(`${field} must be valid URL`, field);
  }
};

const validateRawProfileShape = (profile: Record<string, unknown>) => {
  if (typeof profile.role !== 'string')
    validationError('profile.role must be string', 'profile.role');
  const tone = requireObject(profile.tone, 'profile.tone');
  if (typeof tone.primary !== 'string') {
    validationError('profile.tone.primary must be string', 'profile.tone.primary');
  }
  if (tone.secondary !== undefined && !Array.isArray(tone.secondary)) {
    validationError('profile.tone.secondary must be array', 'profile.tone.secondary');
  }
  const contacts = requireObject(profile.contacts, 'profile.contacts');
  if (contacts.email !== undefined && typeof contacts.email !== 'string') {
    validationError('profile.contacts.email must be string', 'profile.contacts.email');
  }
  if (contacts.telegram !== undefined && typeof contacts.telegram !== 'string') {
    validationError('profile.contacts.telegram must be string', 'profile.contacts.telegram');
  }
  if (contacts.website !== undefined && typeof contacts.website !== 'string') {
    validationError('profile.contacts.website must be string', 'profile.contacts.website');
  }
  if (!Array.isArray(profile.sources))
    validationError('profile.sources must be array', 'profile.sources');
  for (const item of profile.sources as unknown[]) {
    if (typeof item !== 'string')
      validationError('profile.sources must contain strings', 'profile.sources');
    const source = (item as string).trim();
    if (!source)
      validationError('profile.sources must contain non-empty strings', 'profile.sources');
    validateHttpsUrl(source, 'profile.sources');
  }
};

const validateContacts = (profile: ExpertRichProfile) => {
  if (profile.contacts.email && !EMAIL_REGEX.test(profile.contacts.email)) {
    validationError('profile.contacts.email must be valid', 'profile.contacts.email');
  }
  if (profile.contacts.telegram && !TELEGRAM_REGEX.test(profile.contacts.telegram)) {
    validationError('profile.contacts.telegram must be @handle', 'profile.contacts.telegram');
  }
  if (profile.contacts.website)
    validateHttpsUrl(profile.contacts.website, 'profile.contacts.website');
};

export const parseExpertRichProfilePayload = (body: Record<string, unknown>): ExpertRichProfile => {
  const rawProfile = requireObject(body.profile, 'profile');
  validateRawProfileShape(rawProfile);
  const profile = normalizeExpertRichProfile(rawProfile);
  if (!profile.role) validationError('profile.role is required', 'profile.role');
  if (!profile.tone.primary)
    validationError('profile.tone.primary is required', 'profile.tone.primary');
  requireStringMax(profile.role, 120, 'profile.role');
  requireStringMax(profile.tone.primary, 40, 'profile.tone.primary');
  if (profile.tone.secondary.length > 8) {
    validationError('profile.tone.secondary has too many entries', 'profile.tone.secondary');
  }
  if (profile.tags.length > 20)
    validationError('profile.tags has too many entries', 'profile.tags');
  if (profile.sources.length > 20)
    validationError('profile.sources has too many entries', 'profile.sources');
  requireStringMax(profile.background, 2000, 'profile.background');
  validateContacts(profile);
  return profile;
};
