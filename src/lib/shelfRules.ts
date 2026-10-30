export const MAX_SHELF_RULES = 20;
export const MAX_SHELF_RULE_LENGTH = 500;

export function normalizeShelfRules(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((line) => String(line).trim())
    .filter(Boolean)
    .slice(0, MAX_SHELF_RULES)
    .map((line) => line.slice(0, MAX_SHELF_RULE_LENGTH));
}

/** One rule per line in host forms. */
export function parseShelfRulesText(text: string): string[] {
  return normalizeShelfRules(text.split('\n'));
}

export function formatShelfRulesForEdit(rules: string[] | undefined | null): string {
  return normalizeShelfRules(rules ?? []).join('\n');
}
