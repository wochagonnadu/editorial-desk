// PATH: services/api/src/core/http/read-text-body.ts
// WHAT: Stream reader for request body with timeout and size guards
// WHY:  Avoids hangs and enforces one predictable body-read behavior in API core
// RELEVANT: services/api/src/core/http/read-json-body.ts,services/api/src/core/http/body-reader-errors.ts,services/api/src/routes/webhooks.ts

import {
  createInvalidJsonError,
  createPayloadTooLargeError,
  createTimeoutError,
  normalizeBodyReaderError,
} from './body-reader-errors.js';

const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_MAX_BYTES = 16_384;

type ReadMode = 'strict' | 'optional';

export interface ReadBodyTextOptions {
  timeoutMs?: number;
  maxBytes?: number;
  mode?: ReadMode;
}

const asPositiveInt = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return fallback;
  return Math.floor(value as number);
};

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

const getReader = (request: Request): ReadableStreamDefaultReader<Uint8Array> | null => {
  if (!request.body) return null;
  if (request.bodyUsed) throw createInvalidJsonError('Request body stream already consumed');
  try {
    return request.body.getReader();
  } catch (error) {
    throw normalizeBodyReaderError(error);
  }
};

export async function readTextBody(request: Request, options: ReadBodyTextOptions = {}) {
  const timeoutMs = asPositiveInt(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const maxBytes = asPositiveInt(options.maxBytes, DEFAULT_MAX_BYTES);
  const mode = options.mode ?? 'strict';
  const reader = getReader(request);

  if (!reader) {
    if (mode === 'optional') return null;
    throw createInvalidJsonError('Request body is required');
  }

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
      if (!value || value.byteLength === 0) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) throw createPayloadTooLargeError(maxBytes);
      bodyText += decoder.decode(value, { stream: true });
    }
    bodyText += decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw normalizeBodyReaderError(error);
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    if (mode === 'optional') return null;
    throw createInvalidJsonError('Request body is required');
  }

  return bodyText;
}
