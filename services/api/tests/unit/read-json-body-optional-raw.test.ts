// PATH: services/api/tests/unit/read-json-body-optional-raw.test.ts
// WHAT: Unit tests for optional JSON and strict raw body readers
// WHY:  Protects query fallback behavior and blocks accidental stream re-reads
// RELEVANT: services/api/src/core/http/read-json-body.ts,services/api/src/core/http/body-reader-errors.ts,services/api/src/routes/webhooks.ts

import { AppError } from '../../src/core/errors';
import {
  readJsonBodyOptional,
  readJsonBodyStrict,
  readRawBodyStrict,
} from '../../src/core/http/read-json-body';

const createJsonRequest = (rawBody: string): Request =>
  new Request('http://local/webhooks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: rawBody,
  });

describe('readJsonBodyOptional', () => {
  it('returns null when request has no body', async () => {
    const body = await readJsonBodyOptional(
      new Request('http://local/webhooks', { method: 'POST' }),
    );
    expect(body).toBeNull();
  });

  it('returns null for malformed JSON to preserve query fallback routes', async () => {
    const body = await readJsonBodyOptional(createJsonRequest('{"action":}'));
    expect(body).toBeNull();
  });

  it('parses JSON when payload is valid', async () => {
    const body = await readJsonBodyOptional<{ action: string }>(
      createJsonRequest(JSON.stringify({ action: 'approve' })),
    );
    expect(body?.action).toBe('approve');
  });
});

describe('readRawBodyStrict', () => {
  it('returns raw text body for signed payload flows', async () => {
    const raw = await readRawBodyStrict(createJsonRequest('{"ok":true}'));
    expect(raw).toBe('{"ok":true}');
  });

  it('fails with INVALID_JSON when body is missing', async () => {
    await expect(
      readRawBodyStrict(new Request('http://local/webhooks', { method: 'POST' })),
    ).rejects.toMatchObject({
      code: 'INVALID_JSON',
      status: 400,
    } satisfies Pick<AppError, 'code' | 'status'>);
  });

  it('fails with INVALID_JSON when stream already consumed', async () => {
    const request = createJsonRequest('{"ok":true}');
    await readRawBodyStrict(request);
    await expect(readJsonBodyStrict(request)).rejects.toMatchObject({
      code: 'INVALID_JSON',
      status: 400,
    } satisfies Pick<AppError, 'code' | 'status'>);
  });
});
