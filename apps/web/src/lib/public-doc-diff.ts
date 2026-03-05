// PATH: apps/web/src/lib/public-doc-diff.ts
// WHAT: Builds compact line-level diff view for public document review
// WHY:  Lets reviewers see concrete base/current changes in one screen
// RELEVANT: apps/web/src/pages/PublicDoc.tsx,apps/web/src/services/docs.ts

export type PublicDocDiffRow = {
  type: 'added' | 'removed';
  text: string;
};

export type PublicDocDiffView = {
  rows: PublicDocDiffRow[];
  addedCount: number;
  removedCount: number;
};

const toLines = (value: string): string[] =>
  value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const bump = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

export const buildPublicDocDiffView = (
  sourceContent: string,
  targetContent: string,
  maxRows = 40,
): PublicDocDiffView => {
  const sourceLines = toLines(sourceContent);
  const targetLines = toLines(targetContent);

  const remainingSource = new Map<string, number>();
  sourceLines.forEach((line) => bump(remainingSource, line));

  const added: string[] = [];
  for (const line of targetLines) {
    const available = remainingSource.get(line) ?? 0;
    if (available > 0) {
      remainingSource.set(line, available - 1);
      continue;
    }
    added.push(line);
  }

  const remainingTarget = new Map<string, number>();
  targetLines.forEach((line) => bump(remainingTarget, line));

  const removed: string[] = [];
  for (const line of sourceLines) {
    const available = remainingTarget.get(line) ?? 0;
    if (available > 0) {
      remainingTarget.set(line, available - 1);
      continue;
    }
    removed.push(line);
  }

  const rows: PublicDocDiffRow[] = [
    ...removed.map((text) => ({ type: 'removed' as const, text })),
    ...added.map((text) => ({ type: 'added' as const, text })),
  ].slice(0, maxRows);

  return {
    rows,
    addedCount: added.length,
    removedCount: removed.length,
  };
};
