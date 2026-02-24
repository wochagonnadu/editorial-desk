// PATH: apps/web/vite.config.ts
// WHAT: Vite configuration for the web dashboard
// WHY:  Enables fast local dev and production build defaults
// RELEVANT: apps/web/package.json,apps/web/src/main.tsx

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
