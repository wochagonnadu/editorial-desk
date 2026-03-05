// PATH: services/api/tests/setup-env.ts
// WHAT: Sets stable test env defaults required by app bootstrap
// WHY:  Prevents CI/local flakes when secrets are absent in unit tests
// RELEVANT: services/api/vitest.config.ts,services/api/src/app.ts,services/api/src/providers/llm/gateway.ts

if (!process.env.OPENROUTER_API_KEY) {
  // Tests should not depend on a real upstream key during app bootstrap.
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
}

if (!process.env.DATABASE_URL) {
  // Default target used only to initialize DB client in tests that call createApp().
  process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/editorialdesk';
}
