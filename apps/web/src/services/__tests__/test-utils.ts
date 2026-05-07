// PATH: apps/web/src/services/__tests__/test-utils.ts
// WHAT: Shared lightweight mocks for service tests
// WHY:  Keeps Node service tests small without browser test dependencies
// RELEVANT: apps/web/src/services/__tests__/auth.test.ts,apps/web/src/services/__tests__/session.test.ts

export const mockWindowAndFetch = (
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
) => {
  const originalFetch = globalThis.fetch;
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const originalWindow = (globalThis as { window?: unknown }).window;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const storage = new Map<string, string>();

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: {
        hostname: 'localhost',
        port: '5173',
        origin: 'http://localhost:5173',
      },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    },
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return handler(input, init);
  }) as typeof fetch;

  return {
    calls,
    storage,
    restore: () => {
      globalThis.fetch = originalFetch;
      if (hadWindow) {
        Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
    },
  };
};
