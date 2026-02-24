// PATH: eslint.config.mjs
// WHAT: Root ESLint flat config for monorepo
// WHY:  Keeps code style consistent across packages
// RELEVANT: package.json,tsconfig.base.json,.prettierrc.json

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.min.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
];
