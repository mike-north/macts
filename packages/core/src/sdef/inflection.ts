import * as pluralize from 'pluralize';

/**
 * Get the plural form of a word.
 * Uses library for common cases, handles edge cases.
 */
export function toPlural(word: string): string {
  return pluralize.plural(word);
}

/**
 * Get the singular form of a word.
 */
export function toSingular(word: string): string {
  return pluralize.singular(word);
}

/**
 * Check if a word is plural.
 */
export function isPlural(word: string): boolean {
  return pluralize.isPlural(word);
}

/**
 * Normalize a class name to its resource name.
 * Handles:
 * - CamelCase to kebab-case: displayAlarm → display-alarm
 * - Spaces to hyphens: display alarm → display-alarm
 */
export function normalizeResourceName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/**
 * Infer plural from class name if not provided in SDEF.
 * Falls back to adding 's' for unknown words.
 */
export function inferPlural(singular: string, providedPlural?: string): string {
  if (providedPlural) {
    return providedPlural;
  }
  return toPlural(singular);
}
