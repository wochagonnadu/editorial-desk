// PATH: services/api/tests/unit/db-ssl.test.ts
// WHAT: Unit tests for strict Postgres TLS environment parsing
// WHY:  Guards against silent TLS misconfiguration and runtime 500s
// RELEVANT: services/api/src/providers/db/ssl.ts,services/api/src/providers/db/pool.ts,.env.example

import { afterEach } from 'vitest';
import { buildPgSslConfigFromEnv } from '../../src/providers/db/ssl';

const originalCaB64 = process.env.DB_SSL_CA_B64;

afterEach(() => {
  if (originalCaB64 === undefined) delete process.env.DB_SSL_CA_B64;
  else process.env.DB_SSL_CA_B64 = originalCaB64;
});

describe('db ssl env parsing', () => {
  it('returns strict ssl config for valid base64 pem', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nmock\n-----END CERTIFICATE-----';
    process.env.DB_SSL_CA_B64 = Buffer.from(pem, 'utf8').toString('base64');

    const ssl = buildPgSslConfigFromEnv();

    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.ca).toBe(pem);
  });

  it('fails when DB_SSL_CA_B64 is missing', () => {
    delete process.env.DB_SSL_CA_B64;

    expect(() => buildPgSslConfigFromEnv()).toThrow('DB_SSL_CA_B64 is required');
  });

  it('fails when DB_SSL_CA_B64 does not decode to PEM', () => {
    process.env.DB_SSL_CA_B64 = Buffer.from('not-a-pem', 'utf8').toString('base64');

    expect(() => buildPgSslConfigFromEnv()).toThrow('must decode to a PEM certificate chain');
  });
});
