// PATH: services/api/src/core/http/body-reader-errors.ts
// WHAT: Shared error constructors and mapper for body readers
// WHY:  Keeps parsing failures predictable across strict/optional/raw modes
// RELEVANT: services/api/src/core/http/read-json-body.ts,services/api/src/core/http/read-text-body.ts,services/api/src/core/errors.ts

import { AppError } from '../errors.js';

const BODY_READER_CODES = ['INVALID_JSON', 'REQUEST_TIMEOUT', 'PAYLOAD_TOO_LARGE'] as const;

export type BodyReaderErrorCode = (typeof BODY_READER_CODES)[number];

const isBodyReaderErrorCode = (value: string): value is BodyReaderErrorCode =>
  BODY_READER_CODES.includes(value as BodyReaderErrorCode);

export const createInvalidJsonError = (message = 'Invalid JSON body'): AppError =>
  new AppError(400, 'INVALID_JSON', message);

export const createTimeoutError = (): AppError =>
  new AppError(408, 'REQUEST_TIMEOUT', 'Body parse timeout');

export const createPayloadTooLargeError = (maxBytes: number): AppError =>
  new AppError(413, 'PAYLOAD_TOO_LARGE', `Body exceeds ${maxBytes} bytes`);

export const normalizeBodyReaderError = (error: unknown): AppError => {
  if (error instanceof AppError && isBodyReaderErrorCode(error.code)) return error;
  if (error instanceof TypeError) {
    return createInvalidJsonError('Request body stream is unavailable');
  }
  return createInvalidJsonError('Invalid request body stream');
};
