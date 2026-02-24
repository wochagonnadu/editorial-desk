// PATH: services/api/src/routes/auth-token.ts
// WHAT: JWT signing and verification helpers for API auth
// WHY:  Avoids duplicated token logic across routes and middleware
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/auth-middleware.ts

import { SignJWT, jwtVerify } from 'jose';

export interface SessionPayload {
  userId: string;
  companyId: string;
  role: 'owner' | 'manager';
}

const encoder = new TextEncoder();

const getSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return encoder.encode(secret);
};

export const signSessionToken = async (payload: SessionPayload): Promise<string> => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
};

export const verifySessionToken = async (token: string): Promise<SessionPayload> => {
  const result = await jwtVerify<SessionPayload>(token, getSecret());
  return result.payload;
};
