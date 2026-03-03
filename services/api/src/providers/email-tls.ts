// PATH: services/api/src/providers/email-tls.ts
// WHAT: Parses TLS options for outbound email HTTP transport
// WHY:  Makes Resend HTTPS behavior explicit and configurable per environment
// RELEVANT: services/api/src/providers/email-resend.ts,.env.example,specs/001-virtual-newsroom-mvp/quickstart.md

export interface EmailTlsOptions {
  ca?: string;
  rejectUnauthorized: boolean;
}

const isTrue = (value: string): boolean => ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());

const decodeBase64Pem = (value: string): string => {
  const decoded = Buffer.from(value, 'base64').toString('utf8').trim();
  if (!decoded.includes('BEGIN CERTIFICATE') || !decoded.includes('END CERTIFICATE')) {
    throw new Error('EMAIL_TLS_CA_B64 must decode to a PEM certificate chain');
  }
  return decoded;
};

export const buildEmailTlsOptionsFromEnv = (): EmailTlsOptions => {
  const rejectUnauthorizedRaw = process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;
  const rejectUnauthorized =
    rejectUnauthorizedRaw === undefined ? true : isTrue(rejectUnauthorizedRaw);
  const caBase64 = process.env.EMAIL_TLS_CA_B64?.trim();

  if (!caBase64) {
    return { rejectUnauthorized };
  }

  return {
    ca: decodeBase64Pem(caBase64),
    rejectUnauthorized,
  };
};
