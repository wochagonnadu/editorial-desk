// PATH: apps/web/src/services/api/mapper.ts
// WHAT: Shared DTO mapper from snake_case API keys to camelCase
// WHY:  Keeps adapters consistent and removes repeated key-level mapping code
// RELEVANT: apps/web/src/services/experts.ts,apps/web/src/services/drafts.ts

const snakeToCamel = (key: string): string =>
  key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mapKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(mapKeysDeep);
  if (!isPlainObject(value)) return value;

  const mapped: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    mapped[snakeToCamel(key)] = mapKeysDeep(item);
  }
  return mapped;
};

export const mapDto = <T>(value: unknown): T => mapKeysDeep(value) as T;
