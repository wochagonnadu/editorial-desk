// PATH: services/api/tests/unit/app-cors.test.ts
// WHAT: Checks CORS preflight coverage for both /api/v1 and /v1 paths
// WHY:  Prevents Vercel path-shifted preflight 404 on auth login
// RELEVANT: services/api/src/app.ts,services/api/src/routes/auth.ts,services/api/vercel.json

import { createApp } from '../../src/app';

describe('app CORS', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAppUrl = process.env.APP_URL;

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/editorialdesk';
    process.env.APP_URL = 'https://editorial-desk-web.vercel.app';
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;

    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
  });

  it('returns 204 for OPTIONS /api/v1/auth/login', async () => {
    const app = createApp();
    const response = await app.request('http://local/api/v1/auth/login', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://editorial-desk-web.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'x-auth-email',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://editorial-desk-web.vercel.app',
    );
  });

  it('returns 204 for OPTIONS /v1/auth/login', async () => {
    const app = createApp();
    const response = await app.request('http://local/v1/auth/login', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://editorial-desk-web-git-fix.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'x-auth-email',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://editorial-desk-web-git-fix.vercel.app',
    );
    expect(response.headers.get('access-control-allow-headers')?.toLowerCase()).toContain(
      'x-auth-email',
    );
  });
});
