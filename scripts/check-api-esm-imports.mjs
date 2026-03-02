// PATH: scripts/check-api-esm-imports.mjs
// WHAT: Fails if API/shared relative imports miss explicit ESM extension
// WHY:  Prevents Vercel runtime ERR_MODULE_NOT_FOUND regressions
// RELEVANT: package.json,services/api/api/index.ts,packages/shared/src/index.ts

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['services/api/src', 'services/api/api', 'packages/shared/src'];
const importPattern = /from\s+['"](\.{1,2}\/[^'"]+)['"]/g;

const walk = (dir) => {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else if (path.endsWith('.ts')) files.push(path);
  }
  return files;
};

const offenders = [];
for (const root of roots) {
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    let match;
    while ((match = importPattern.exec(source)) !== null) {
      const specifier = match[1];
      if (
        !specifier.endsWith('.js') &&
        !specifier.endsWith('.json') &&
        !specifier.endsWith('.node')
      ) {
        offenders.push(`${file}: ${specifier}`);
      }
    }
  }
}

if (offenders.length > 0) {
  console.error('Found relative imports without explicit ESM extension:');
  for (const line of offenders) console.error(`- ${line}`);
  process.exit(1);
}

console.log('OK: API/shared relative imports use explicit ESM extension');
