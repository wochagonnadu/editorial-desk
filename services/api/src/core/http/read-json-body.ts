// PATH: services/api/src/core/http/read-json-body.ts
// WHAT: Safe JSON body reader with timeout and payload-size limits
// WHY:  Prevents serverless hangs on body parsing and fails with explicit API errors
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/debug.ts,services/api/src/core/errors.ts

import { AppError } from '../errors.js';

const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_MAX_BYTES = 16_384;

export interface ReadJsonBodyOptions {
  timeoutMs?: number;
  maxBytes?: number;
}

const asPositiveInt = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return fallback;
  return Math.floor(value as number);
};

const createTimeoutError = (): AppError =>
  new AppError(408, 'REQUEST_TIMEOUT', 'Body parse timeout');

const readChunkWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(createTimeoutError()), timeoutMs);
    });
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const readTextBody = async (request: Request, timeoutMs: number, maxBytes: number): Promise<string> => {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'INVALID_JSON', 'Request body is required');

  const decoder = new TextDecoder();
  const deadlineAt = Date.now() + timeoutMs;
  let totalBytes = 0;
  let bodyText = '';

  try {
    while (true) {
      const remainingMs = deadlineAt - Date.now();
      if (remainingMs <= 0) throw createTimeoutError();
      const { done, value } = await readChunkWithTimeout(reader.read(), remainingMs);
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        throw new AppError(413, 'PAYLOAD_TOO_LARGE', `Body exceeds ${maxBytes} bytes`);
      }
      bodyText += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  bodyText += decoder.decode();
  return bodyText;
};

export const readJsonBody = async <T = unknown>(
  request: Request,
  options: ReadJsonBodyOptions = {},
): Promise<T> => {
  const timeoutMs = asPositiveInt(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const maxBytes = asPositiveInt(options.maxBytes, DEFAULT_MAX_BYTES);
  const text = await readTextBody(request, timeoutMs, maxBytes);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'Invalid JSON body');
  }
};
