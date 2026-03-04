// PATH: services/api/tests/unit/read-json-body.test.ts
// WHAT: Unit tests for strict JSON body reader behavior
// WHY:  Locks critical parse errors to prevent timeout and invalid-body regressions
// RELEVANT: services/api/src/core/http/read-json-body.ts,services/api/src/core/http/read-text-body.ts,services/api/src/core/errors.ts

import { AppError } from '../../src/core/errors';
import { readJsonBodyStrict } from '../../src/core/http/read-json-body';

const createJsonRequest = (rawBody: string): Request =>
  new Request('http://local/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: rawBody,
  });

const createStreamRequest = (stream: ReadableStream<Uint8Array>): Request =>
  new Request('http://local/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: stream as unknown as BodyInit,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });

describe('readJsonBodyStrict', () => {
  it('parses valid JSON body', async () => {
    const body = await readJsonBodyStrict<{ email: string }>(
      createJsonRequest(JSON.stringify({ email: 'mail@mail.com' })),
    );
    expect(body.email).toBe('mail@mail.com');
  });

  it('fails with REQUEST_TIMEOUT when stream hangs beyond timeout', async () => {
    const encoder = new TextEncoder();
    const delayedStream = new ReadableStream<Uint8Array>({
      start(controller) {
        setTimeout(() => {
          try {
            controller.enqueue(encoder.encode('{"email":"mail@mail.com"}'));
            controller.close();
          } catch {
            // Stream can be closed by timeout path before delayed enqueue fires.
          }
        }, 50);
      },
    });

    await expect(
      readJsonBodyStrict(createStreamRequest(delayedStream), { timeoutMs: 5 }),
    ).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT', status: 408 } satisfies Pick<
      AppError,
      'code' | 'status'
    >);
  });

  it('fails with PAYLOAD_TOO_LARGE when max bytes exceeded', async () => {
    await expect(
      readJsonBodyStrict(createJsonRequest(JSON.stringify({ email: 'mail@mail.com' })), {
        maxBytes: 10,
      }),
    ).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      status: 413,
    } satisfies Pick<AppError, 'code' | 'status'>);
  });

  it('fails with INVALID_JSON for malformed payload', async () => {
    await expect(readJsonBodyStrict(createJsonRequest('{"email":}'))).rejects.toMatchObject({
      code: 'INVALID_JSON',
      status: 400,
    } satisfies Pick<AppError, 'code' | 'status'>);
  });

  it('fails with INVALID_JSON when body is empty', async () => {
    await expect(
      readJsonBodyStrict(new Request('http://local/login', { method: 'POST' })),
    ).rejects.toMatchObject({
      code: 'INVALID_JSON',
      status: 400,
    } satisfies Pick<AppError, 'code' | 'status'>);
  });
});
