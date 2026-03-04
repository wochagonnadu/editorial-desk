// PATH: services/api/src/worker/runtime-utils.ts
// WHAT: Small async helpers for worker runtime execution
// WHY:  Keeps runtime module focused and below size limits
// RELEVANT: services/api/src/worker/runtime.ts,services/api/src/worker/retry-policy.ts

export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const withTimeout = async <T>(operation: Promise<T>, timeoutMs: number): Promise<T> => {
  return await Promise.race([
    operation,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('worker.timeout')), timeoutMs),
    ),
  ]);
};
