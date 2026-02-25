// PATH: apps/web/src/constants/vocabulary.ts
// WHAT: Editorial vocabulary — запрещённые и разрешённые термины
// WHY:  FR-003 + Constitution Principle I — editorial framing enforcement
// RELEVANT: apps/web/src/App.tsx, .specify/memory/constitution.md

/**
 * Запрещённые слова в UI (constitution + spec FR-003).
 * При аудите (T044) проверяем что ни одно из них не встречается.
 */
export const PROHIBITED_TERMS = [
  'generation',
  'automation',
  'AI-powered',
  'generator',
  'error',
  'failed',
] as const;

/**
 * Рекомендованные замены для editorial tone.
 * Ключ — что хочется написать, значение — что нужно.
 */
export const EDITORIAL_REPLACEMENTS: Record<string, string> = {
  error: 'needs clarification',
  failed: 'needs attention',
  generated: 'draft ready',
  'overdue alert': 'gentle reminder',
  'claims failed': 'facts to confirm',
} as const;

/**
 * Разрешённые термины для UI (для справки при ревью).
 */
export const PERMITTED_TERMS = [
  'editors',
  'draft',
  'proofreading',
  'approval',
  'editorial plan',
  'accountability',
  'needs clarification',
  'draft ready',
  'gentle reminder',
  'facts to confirm',
] as const;

const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Приводит пользовательские сообщения к editorial tone.
 * Используем в UI при выводе backend/client ошибок.
 */
export const editorizeText = (text: string): string => {
  let next = text;
  for (const [from, to] of Object.entries(EDITORIAL_REPLACEMENTS)) {
    next = next.replace(new RegExp(escaped(from), 'gi'), to);
  }
  return next;
};
