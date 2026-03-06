// PATH: scripts/optimize-team-images.mjs
// WHAT: Builds JPG, WebP and AVIF variants for landing team portraits
// WHY:  Keeps marketing portraits web-ready with modern formats and safe fallback
// RELEVANT: apps/web/src/public/images/team,apps/web/src/components/TeamCarousel.tsx,apps/web/src/components/HeroInteractive.tsx

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, renameSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';

const teamDir = join(process.cwd(), 'apps/web/src/public/images/team');
const tempDir = mkdtempSync(join(tmpdir(), 'editorialdesk-team-images-'));
const maxLongestEdge = 1200;
const jpgQuality = 70;
const webpQuality = 65;
const avifMin = 20;
const avifMax = 32;

const sourceFiles = readdirSync(teamDir)
  .filter((file) => ['.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase()))
  .sort((left, right) => left.localeCompare(right));

if (sourceFiles.length === 0) {
  console.log('No team portraits found.');
  rmSync(tempDir, { recursive: true, force: true });
  process.exit(0);
}

let totalBefore = 0;
let totalAfterJpg = 0;

for (const fileName of sourceFiles) {
  const sourcePath = join(teamDir, fileName);
  const baseName = basename(fileName, extname(fileName));
  const outputPaths = {
    jpg: join(teamDir, `${baseName}.jpg`),
    webp: join(teamDir, `${baseName}.webp`),
    avif: join(teamDir, `${baseName}.avif`),
  };
  const tempPaths = {
    jpg: join(tempDir, `${baseName}.jpg`),
    webp: join(tempDir, `${baseName}.webp`),
    avif: join(tempDir, `${baseName}.avif`),
  };
  const beforeSize = statSync(sourcePath).size;

  execFileSync(
    'sips',
    [
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      String(jpgQuality),
      '-Z',
      String(maxLongestEdge),
      sourcePath,
      '--out',
      tempPaths.jpg,
    ],
    { stdio: 'ignore' },
  );

  execFileSync(
    'cwebp',
    ['-quiet', '-q', String(webpQuality), tempPaths.jpg, '-o', tempPaths.webp],
    {
      stdio: 'ignore',
    },
  );

  execFileSync(
    'avifenc',
    [
      '--min',
      String(avifMin),
      '--max',
      String(avifMax),
      '--speed',
      '6',
      tempPaths.jpg,
      tempPaths.avif,
    ],
    { stdio: 'ignore' },
  );

  renameSync(tempPaths.jpg, outputPaths.jpg);
  renameSync(tempPaths.webp, outputPaths.webp);
  renameSync(tempPaths.avif, outputPaths.avif);

  if (![outputPaths.jpg, outputPaths.webp, outputPaths.avif].includes(sourcePath)) {
    unlinkSync(sourcePath);
  }

  const jpgSize = statSync(outputPaths.jpg).size;
  const webpSize = statSync(outputPaths.webp).size;
  const avifSize = statSync(outputPaths.avif).size;

  totalBefore += beforeSize;
  totalAfterJpg += jpgSize;

  console.log(
    `${fileName}: jpg ${Math.round(jpgSize / 1024)}KB, webp ${Math.round(webpSize / 1024)}KB, avif ${Math.round(avifSize / 1024)}KB`,
  );
}

rmSync(tempDir, { recursive: true, force: true });

console.log(
  `Total JPG fallback: ${Math.round(totalBefore / 1024)}KB -> ${Math.round(totalAfterJpg / 1024)}KB`,
);
