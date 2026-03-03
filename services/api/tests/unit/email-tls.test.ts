// PATH: services/api/tests/unit/email-tls.test.ts
// WHAT: Unit tests for outbound email TLS environment parsing
// WHY:  Prevents silent misconfiguration when using custom CA with Resend
// RELEVANT: services/api/src/providers/email-tls.ts,services/api/src/providers/email-resend.ts,.env.example

import { afterEach } from 'vitest';
import { buildEmailTlsOptionsFromEnv } from '../../src/providers/email-tls';

const originalCa = process.env.EMAIL_TLS_CA_B64;
const originalReject = process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;

afterEach(() => {
  if (originalCa === undefined) delete process.env.EMAIL_TLS_CA_B64;
  else process.env.EMAIL_TLS_CA_B64 = originalCa;
  if (originalReject === undefined) delete process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;
  else process.env.EMAIL_TLS_REJECT_UNAUTHORIZED = originalReject;
});

describe('email tls env parsing', () => {
  it('defaults to strict mode without custom CA', () => {
    delete process.env.EMAIL_TLS_CA_B64;
    delete process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;

    const tls = buildEmailTlsOptionsFromEnv();

    expect(tls.ca).toBeUndefined();
    expect(tls.rejectUnauthorized).toBe(true);
  });

  it('parses custom CA and allows explicit rejectUnauthorized=false', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nmock\n-----END CERTIFICATE-----';
    process.env.EMAIL_TLS_CA_B64 = Buffer.from(pem, 'utf8').toString('base64');
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED = 'false';

    const tls = buildEmailTlsOptionsFromEnv();

    expect(tls.ca).toBe(pem);
    expect(tls.rejectUnauthorized).toBe(false);
  });

  it('fails for non-pem CA values', () => {
    process.env.EMAIL_TLS_CA_B64 = Buffer.from('not-pem', 'utf8').toString('base64');

    expect(() => buildEmailTlsOptionsFromEnv()).toThrow('must decode to a PEM certificate chain');
  });
});
