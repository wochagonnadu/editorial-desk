// PATH: services/api/src/core/diff-summary.ts
// WHAT: Builds short text-only diff highlights between two draft versions
// WHY:  Adds useful "what changed" context to approval communication
// RELEVANT: services/api/src/routes/drafts/approval.ts,services/api/src/routes/webhooks-click.ts

const splitLines = (value: string): string[] =>
  value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const splitParagraphs = (value: string): string[] =>
  value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

const short = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 90) return normalized;
  return `${normalized.slice(0, 87)}...`;
};

export const buildDiffSummaryBullets = (
  previousContent: string | null,
  currentContent: string,
): string[] => {
  if (!currentContent.trim()) return [];
  if (!previousContent || !previousContent.trim()) return ['Initial version prepared for review'];

  const previousParagraphs = splitParagraphs(previousContent);
  const currentParagraphs = splitParagraphs(currentContent);
  const previousLines = splitLines(previousContent);
  const currentLines = splitLines(currentContent);

  const previousParagraphSet = new Set(previousParagraphs);
  const currentParagraphSet = new Set(currentParagraphs);
  const previousLineSet = new Set(previousLines);
  const currentLineSet = new Set(currentLines);

  const addedParagraphs = currentParagraphs.filter((item) => !previousParagraphSet.has(item));
  const removedParagraphs = previousParagraphs.filter((item) => !currentParagraphSet.has(item));
  const addedLines = currentLines.filter((item) => !previousLineSet.has(item));
  const removedLines = previousLines.filter((item) => !currentLineSet.has(item));

  const bullets: string[] = [];
  if (addedParagraphs.length > 0) bullets.push(`Added paragraphs: ${addedParagraphs.length}`);
  if (removedParagraphs.length > 0) bullets.push(`Removed paragraphs: ${removedParagraphs.length}`);
  if (addedLines.length > 0 || removedLines.length > 0) {
    bullets.push(`Line edits: +${addedLines.length} / -${removedLines.length}`);
  }

  addedParagraphs.slice(0, 1).forEach((item) => bullets.push(`New: ${short(item)}`));
  removedParagraphs.slice(0, 1).forEach((item) => bullets.push(`Removed: ${short(item)}`));

  if (bullets.length === 0) return ['Minor wording cleanup with no structural changes'];
  return bullets.slice(0, 5);
};
