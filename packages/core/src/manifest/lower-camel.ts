/**
 * Acronym-aware word splitting and lower camel case.
 *
 * macts reads a manifest identifier (a resource's plural, an app name, a
 * resource or enum key, a command name) as words, treating a run of capitals
 * as one acronym: `AIMHandles` is `AIM` `Handles`, `invokeAPIExpression` is
 * `invoke` `API` `Expression`, `URLs` is the one word `URLs`. Every spelling
 * derived from an identifier uses this one split:
 *
 * - lower camel case ({@link lowerCamel}): the resource segment of routes, SDK
 *   accessors, tool names, capabilities and derived permissions
 *   (`normalizeResourceRouteSegment` in `./route.ts`), and the contract
 *   generator's binding names (`MediaItems` → `mediaItems`);
 * - snake case, the operation part of an MCP tool name
 *   (`invokeAPIExpression` → `invoke_api_expression`);
 * - prose, in generated documentation (`AIMHandles` → `AIM handles`).
 *
 * @packageDocumentation
 */

/**
 * One word of an identifier, in the order the alternatives are tried:
 *
 * 1. an acronym before a capitalized word: `AIM` in `AIMHandles`, `API` in
 *    `invokeAPIExpression` (but not `UR` before the lone plural `s` of `URLs`);
 * 2. an acronym, with its plural `s` and any digits: `URLs`, `TV`, `ID3`;
 * 3. a word, with any digits: `Media`, `invoke`, `Mp3`;
 * 4. a lone capital, with any digits;
 * 5. a run of digits.
 *
 * Any other character separates words and belongs to none.
 */
const WORD =
  /[A-Z]+(?=[A-Z](?!s(?![a-z]))[a-z])|[A-Z]{2,}(?:s(?![a-z]))?[0-9]*|[A-Z]?[a-z]+[0-9]*|[A-Z][0-9]*|[0-9]+/g

/**
 * The words of an identifier, as written.
 *
 * A run of capitals is one acronym, except that its last capital begins the
 * next word when a lower-case letter follows (`XMLParser` → `XML`, `Parser`).
 * A lone `s` after an acronym is its plural, not a word (`URLs`, `listURLs` →
 * `list`, `URLs`). Digits stay with the word before them (`ID3Tags` → `ID3`,
 * `Tags`).
 *
 * @param identifier - A Pascal or camel case identifier.
 * @returns Its words, each with its original letter case.
 */
export function splitIdentifierWords(identifier: string): string[] {
  return identifier.match(WORD) ?? []
}

/**
 * Lower camel case of a Pascal case identifier: its first word
 * ({@link splitIdentifierWords}) lowercased, the rest as written.
 *
 * So a leading acronym is lowercased whole and the capital that begins the
 * next word stays: `OmniFocus` → `omniFocus`, `XMLParser` → `xmlParser`,
 * `AIMHandles` → `aimHandles`, `URLs` → `urls`, `ID3Tags` → `id3Tags`,
 * `TV` → `tv`. Capitals after the first word, and a name that already starts
 * in lower case, are kept: `AudioCDTracks` → `audioCDTracks`, `iTerm` →
 * `iTerm`.
 *
 * @param name - A Pascal case identifier, such as a resource plural.
 * @returns Its lower camel case form.
 */
export function lowerCamel(name: string): string {
  const first = splitIdentifierWords(name)[0]
  if (first === undefined || !name.startsWith(first)) return name
  return first.toLowerCase() + name.slice(first.length)
}
