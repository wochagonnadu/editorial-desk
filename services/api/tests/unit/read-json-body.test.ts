// PATH: services/api/tests/unit/read-json-body.test.ts
// WHAT: Unit tests for guarded JSON body reader used by auth login
// WHY:  Locks timeout/size/invalid-json behavior to prevent runtime regressions
// RELEVANT: services/api/src/core/http/read-json-body.ts,services/api/src/routes/auth.ts,services/api/src/core/errors.ts

import { AppError } from '../../src/core/errors';
import { readJsonBody } from '../../src/core/http/read-json-body';

const createJsonRequest = (rawBody: string): Request =>
  new Request('http://local/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: rawBody,
  });

const createStreamRequest = (stream: ReadableStream<Uint8Array>): Request =>
  new Request(
    'http://local/login',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream as unknown as BodyInit,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' },
  );

describe('readJsonBody', () => {
  it('parses valid JSON body', async () => {
    const body = await readJsonBody<{ email: string }>(
      createJsonRequest(JSON.stringify({ email: 'mail@mail.com' })),
    );
    expect(body.email).toBe('mail@mail.com');
  });

  it('fails with REQUEST_TIMEOUT when stream hangs beyond timeout', async () => {
    const encoder = new TextEncoder();
    const delayedStream = new ReadableStream<Uint8Array>({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(encoder.encode('{"email":"mail@mail.com"}'));
          controller.close();
        }, 50);
      },
    });

    await expect(
      readJsonBody(createStreamRequest(delayedStream), { timeoutMs: 5 }),
    ).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT', status: 408 } satisfies Pick<AppError, 'code' | 'status'>);
  });

  it('fails with PAYLOAD_TOO_LARGE when max bytes exceeded', async () => {
    await expect(
      readJsonBody(createJsonRequest(JSON.stringify({ email: 'mail@mail.com' })), { maxBytes: 10 }),
    ).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      status: 413,
    } satisfies Pick<AppError, 'code' | 'status'>);
  });

  it('fails with INVALID_JSON for malformed payload', async () => {
    await expect(readJsonBody(createJsonRequest('{"email":}'))).rejects.toMatchObject({
      code: 'INVALID_JSON',
      status: 400,
    } satisfies Pick<AppError, 'code' | 'status'>);
  });
});
