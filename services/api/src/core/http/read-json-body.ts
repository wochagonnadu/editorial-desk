// PATH: services/api/src/core/http/read-json-body.ts
// WHAT: JSON/raw body readers for strict and optional endpoint contracts
// WHY:  Gives one safe parse contract for form routes and signed webhooks
// RELEVANT: services/api/src/core/http/read-text-body.ts,services/api/src/core/http/body-reader-errors.ts,services/api/src/routes/experts.ts

import { createInvalidJsonError } from './body-reader-errors.js';
import { readTextBody, type ReadBodyTextOptions } from './read-text-body.js';

export type ReadJsonBodyOptions = Omit<ReadBodyTextOptions, 'mode'>;

const parseJsonStrict = <T>(text: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw createInvalidJsonError('Invalid JSON body');
  }
};

const parseJsonOptional = <T>(text: string): T | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Optional mode keeps query/body fallback endpoints backward-compatible.
    return null;
  }
};

export const readJsonBodyStrict = async <T = unknown>(
  request: Request,
  options: ReadJsonBodyOptions = {},
): Promise<T> => {
  const text = await readTextBody(request, {
    timeoutMs: options.timeoutMs,
    maxBytes: options.maxBytes,
    mode: 'strict',
  });
  if (text === null) throw createInvalidJsonError('Request body is required');
  return parseJsonStrict<T>(text);
};

export const readJsonBodyOptional = async <T = unknown>(
  request: Request,
  options: ReadJsonBodyOptions = {},
): Promise<T | null> => {
  const text = await readTextBody(request, {
    timeoutMs: options.timeoutMs,
    maxBytes: options.maxBytes,
    mode: 'optional',
  });
  if (text === null) return null;
  return parseJsonOptional<T>(text);
};

export const readRawBodyStrict = async (
  request: Request,
  options: ReadJsonBodyOptions = {},
): Promise<string> => {
  const text = await readTextBody(request, {
    timeoutMs: options.timeoutMs,
    maxBytes: options.maxBytes,
    mode: 'strict',
  });
  if (text === null) throw createInvalidJsonError('Request body is required');
  return text;
};

export const readJsonBody = readJsonBodyStrict;
