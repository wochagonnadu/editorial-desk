// PATH: services/api/vitest.config.ts
// WHAT: Vitest configuration for API unit and integration tests
// WHY:  Enables fast automated regression checks for core flows
// RELEVANT: services/api/package.json,services/api/tests/unit/voice.test.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    globals: true,
    clearMocks: true,
  },
});
