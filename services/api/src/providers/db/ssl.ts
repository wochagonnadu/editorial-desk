// PATH: services/api/src/providers/db/ssl.ts
// WHAT: Builds strict TLS config for Postgres pool from environment variables
// WHY:  Enforces verify-full behavior and fails fast on broken CA setup
// RELEVANT: services/api/src/providers/db/pool.ts,.env.example,specs/001-virtual-newsroom-mvp/quickstart.md

import type { ConnectionOptions } from 'node:tls';

const decodeBase64 = (value: string): string => {
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8').trim();
    if (!decoded) {
      throw new Error('decoded value is empty');
    }
    return decoded;
  } catch {
    throw new Error('DB_SSL_CA_B64 must be a valid base64-encoded PEM certificate');
  }
};

const assertPemCertificate = (value: string): void => {
  if (!value.includes('BEGIN CERTIFICATE') || !value.includes('END CERTIFICATE')) {
    throw new Error('DB_SSL_CA_B64 must decode to a PEM certificate chain');
  }
};

export const buildPgSslConfigFromEnv = (): ConnectionOptions => {
  const caBase64 = process.env.DB_SSL_CA_B64;
  if (!caBase64) {
    throw new Error('DB_SSL_CA_B64 is required for strict Postgres TLS');
  }

  const ca = decodeBase64(caBase64);
  assertPemCertificate(ca);

  return {
    ca,
    rejectUnauthorized: true,
  };
};
