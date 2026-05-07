// PATH: apps/web/scripts/smoke-cdp.mjs
// WHAT: Tiny Chrome DevTools helpers for browser smoke scripts
// WHY:  Reuses browser launch, CDP calls, and wait loops without Playwright
// RELEVANT: apps/web/scripts/smoke-login-onboarding.mjs,apps/web/package.json

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const startDevServer = (appRoot, webPort) => {
  const args = ['exec', 'vite', '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'];
  const child = spawn('pnpm', args, { cwd: appRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
};

export const waitForHttp = async (url) => {
  for (let index = 0; index < 80; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const findChrome = () => {
  const paths = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
  return paths.filter(Boolean).find((path) => existsSync(path));
};

export const launchChrome = async (cdpPort) => {
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome/Chromium not found. Set CHROME_PATH to run browser smoke.');
  const userDataDir = await mkdtemp(join(tmpdir(), 'editorialdesk-smoke-'));
  const args = [`--remote-debugging-port=${cdpPort}`, `--user-data-dir=${userDataDir}`, '--headless=new', '--disable-gpu', '--no-first-run', 'about:blank'];
  const browser = spawn(chrome, args, { stdio: 'ignore' });
  return { browser, userDataDir };
};

export const cleanupChrome = async ({ browser, userDataDir }) => {
  browser.kill();
  await rm(userDataDir, { recursive: true, force: true });
};

export const openCdp = async (cdpPort) => {
  await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`);
  const targets = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((res) => res.json());
  const page = targets.find((target) => target.type === 'page') ?? targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data.toString());
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
      return;
    }
    listeners.get(message.method)?.forEach((listener) => listener(message.params));
  });

  return {
    send(method, params = {}) {
      id += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    on(method, listener) {
      listeners.set(method, [...(listeners.get(method) ?? []), listener]);
    },
  };
};

export const evaluate = (cdp, expression) =>
  cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then((result) => {
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  });

export const waitFor = async (cdp, expression, label) => {
  for (let index = 0; index < 80; index += 1) {
    if (await evaluate(cdp, expression).catch(() => false)) return;
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${label}`);
};
