// PATH: apps/web/src/lib/draft-diff.ts
// WHAT: Builds lightweight diff summary between two draft version texts
// WHY:  Gives editors quick version insight without external dependencies
// RELEVANT: apps/web/src/pages/DraftEditor.tsx,apps/web/src/services/drafts.ts

export type DraftDiffSummary = {
  bullets: string[];
  addedParagraphs: number;
  removedParagraphs: number;
  lineAdds: number;
  lineRemoves: number;
};

const toParagraphs = (value: string): string[] =>
  value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

const toLines = (value: string): string[] =>
  value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const short = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 120) return normalized;
  return `${normalized.slice(0, 117)}...`;
};

export const buildDraftDiffSummary = (source: string, target: string): DraftDiffSummary => {
  const sourceParagraphs = toParagraphs(source);
  const targetParagraphs = toParagraphs(target);
  const sourceLines = toLines(source);
  const targetLines = toLines(target);

  const sourceParagraphSet = new Set(sourceParagraphs);
  const targetParagraphSet = new Set(targetParagraphs);
  const sourceLineSet = new Set(sourceLines);
  const targetLineSet = new Set(targetLines);

  const addedParagraphs = targetParagraphs.filter((item) => !sourceParagraphSet.has(item));
  const removedParagraphs = sourceParagraphs.filter((item) => !targetParagraphSet.has(item));
  const addedLines = targetLines.filter((item) => !sourceLineSet.has(item));
  const removedLines = sourceLines.filter((item) => !targetLineSet.has(item));

  const bullets: string[] = [];
  if (addedParagraphs.length > 0) bullets.push(`Added paragraphs: ${addedParagraphs.length}`);
  if (removedParagraphs.length > 0) bullets.push(`Removed paragraphs: ${removedParagraphs.length}`);
  if (addedLines.length > 0 || removedLines.length > 0) {
    bullets.push(`Line-level edits: +${addedLines.length} / -${removedLines.length}`);
  }

  addedParagraphs.slice(0, 2).forEach((item) => bullets.push(`New: ${short(item)}`));
  removedParagraphs.slice(0, 2).forEach((item) => bullets.push(`Removed: ${short(item)}`));

  return {
    bullets: bullets.slice(0, 5),
    addedParagraphs: addedParagraphs.length,
    removedParagraphs: removedParagraphs.length,
    lineAdds: addedLines.length,
    lineRemoves: removedLines.length,
  };
};
