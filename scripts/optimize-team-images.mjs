// PATH: scripts/optimize-team-images.mjs
// WHAT: Normalizes landing team portraits to lightweight JPG assets
// WHY:  Keeps marketing portraits web-ready without manual image editing work
// RELEVANT: apps/web/src/public/images/team,apps/web/src/components/TeamCarousel.tsx,apps/web/src/components/HeroInteractive.tsx

import { mkdtempSync, readdirSync, renameSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const teamDir = join(process.cwd(), 'apps/web/src/public/images/team');
const tempDir = mkdtempSync(join(tmpdir(), 'editorialdesk-team-images-'));
const maxLongestEdge = 1200;
const jpegQuality = 70;

const sourceFiles = readdirSync(teamDir)
  .filter((file) => ['.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase()))
  .sort((left, right) => left.localeCompare(right));

if (sourceFiles.length === 0) {
  console.log('No team portraits found.');
  rmSync(tempDir, { recursive: true, force: true });
  process.exit(0);
}

let totalBefore = 0;
let totalAfter = 0;

for (const fileName of sourceFiles) {
  const sourcePath = join(teamDir, fileName);
  const targetName = `${basename(fileName, extname(fileName))}.jpg`;
  const targetPath = join(teamDir, targetName);
  const tempPath = join(tempDir, targetName);
  const beforeSize = statSync(sourcePath).size;

  execFileSync(
    'sips',
    [
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      String(jpegQuality),
      '-Z',
      String(maxLongestEdge),
      sourcePath,
      '--out',
      tempPath,
    ],
    { stdio: 'ignore' },
  );

  if (sourcePath !== targetPath) unlinkSync(sourcePath);
  renameSync(tempPath, targetPath);

  const afterSize = statSync(targetPath).size;
  totalBefore += beforeSize;
  totalAfter += afterSize;

  const savedKb = ((beforeSize - afterSize) / 1024).toFixed(1);
  console.log(
    `${fileName}: ${Math.round(beforeSize / 1024)}KB -> ${Math.round(afterSize / 1024)}KB (${savedKb}KB saved)`,
  );
}

rmSync(tempDir, { recursive: true, force: true });

const totalSavedKb = ((totalBefore - totalAfter) / 1024).toFixed(1);
console.log(
  `Total: ${Math.round(totalBefore / 1024)}KB -> ${Math.round(totalAfter / 1024)}KB (${totalSavedKb}KB saved)`,
);
