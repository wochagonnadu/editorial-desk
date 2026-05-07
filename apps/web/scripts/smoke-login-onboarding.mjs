// PATH: apps/web/scripts/smoke-login-onboarding.mjs
// WHAT: Browser smoke test for login and first-run onboarding
// WHY:  Verifies the critical UI path without adding browser-test dependencies
// RELEVANT: apps/web/scripts/smoke-cdp.mjs,apps/web/src/pages/Login.tsx,apps/web/src/pages/ManagerOnboarding.tsx,TESTING_PLAN.md

import { resolve } from 'node:path';
import { cleanupChrome, evaluate, launchChrome, openCdp, startDevServer, waitFor, waitForHttp } from './smoke-cdp.mjs';

const appRoot = resolve(import.meta.dirname, '..');
const webPort = Number(process.env.SMOKE_WEB_PORT || 5173);
const cdpPort = Number(process.env.SMOKE_CDP_PORT || 9222);
const baseUrl = `http://127.0.0.1:${webPort}`;

const jsonResponse = (body) => ({
  responseCode: 200,
  responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
  body: Buffer.from(JSON.stringify(body)).toString('base64'),
});

const fillApiMock = (cdp) => {
  let onboarding = { status: 'not_started', current_step: 'welcome' };
  cdp.on('Fetch.requestPaused', (event) => {
    const url = new URL(event.request.url);
    let body = {};
    if (url.pathname === '/api/v1/auth/login') body = { message: 'ok', dev_magic_token: 'dev-token' };
    if (url.pathname === '/api/v1/auth/verify') {
      body = {
        token: 'session-token',
        user: { id: 'user-1', email: 'smoke@local.test', role: 'owner', company_id: 'company-1' },
      };
    }
    if (url.pathname === '/api/v1/users/me/setup-status') {
      body = { setup_required: false, setup_completed_at: new Date().toISOString() };
    }
    if (url.pathname === '/api/v1/users/me/onboarding' && event.request.method === 'GET') {
      body = onboarding;
    }
    if (url.pathname === '/api/v1/users/me/onboarding' && event.request.method === 'PATCH') {
      onboarding = JSON.parse(event.request.postData || '{}');
      body = onboarding.status === 'completed' ? { status: 'completed', current_step: null } : onboarding;
    }
    if (url.pathname === '/api/v1/dashboard') {
      body = { today_actions: [], in_review: [], team_pulse: [], week_schedule: [] };
    }
    void cdp.send('Fetch.fulfillRequest', { requestId: event.requestId, ...jsonResponse(body) });
  });
};

const clickButton = (cdp, text) =>
  evaluate(
    cdp,
    `[...document.querySelectorAll('button')].find((button)=>button.textContent.trim()===${JSON.stringify(text)}).click(); true;`,
  );

const runFlow = async (cdp) => {
  await cdp.send('Page.navigate', { url: `${baseUrl}/login` });
  await waitFor(cdp, "Boolean(document.querySelector('input[name=email]'))", 'login form');
  await evaluate(
    cdp,
    "const input=document.querySelector('input[name=email]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'smoke@local.test'); input.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('button[type=submit]').click(); true;",
  );
  await waitFor(cdp, "location.pathname === '/app/onboarding'", 'onboarding page');

  for (const title of ['Start your newsroom tour', 'Review workspace settings', 'Check team roles']) {
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(title)})`, title);
    await clickButton(cdp, 'Continue');
  }
  await waitFor(cdp, "document.body.innerText.includes('Move into the first workflow')", 'final step');
  await clickButton(cdp, 'Complete');
  await waitFor(cdp, "location.pathname === '/app' && document.body.innerText.includes('Good morning')", 'workspace');
};

const main = async () => {
  const chrome = await launchChrome(cdpPort);
  const devServer = startDevServer(appRoot, webPort);
  try {
    await waitForHttp(`${baseUrl}/login`);
    const cdp = await openCdp(cdpPort);
    fillApiMock(cdp);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    await runFlow(cdp);
    console.log('login/onboarding browser smoke passed');
  } finally {
    devServer.kill();
    await cleanupChrome(chrome);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
