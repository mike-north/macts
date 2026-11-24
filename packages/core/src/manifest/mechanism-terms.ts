/**
 * The rule that keeps the automation mechanism out of macts surfaces.
 *
 * macts presents an app as typed operations over its resources. How macts
 * reaches the app is an implementation detail no caller depends on, so no
 * surface (capability discovery, contracts, the CLI, generated clients, MCP
 * tools, the server) names it. An app's scripting dictionary is written for
 * that mechanism, and a manifest starts from the dictionary's words, so the
 * manifest is where the rule applies: every surface is derived from it.
 *
 * The rule: no string a manifest declares names the mechanism, whether a
 * description, a name or a key. A manifest author whose dictionary text names
 * it rewrites the text to say what the app does (or drops a clause that only
 * concerns the mechanism, such as which keywords its syntax makes optional).
 * Two kinds of text are exempt because they record the dictionary rather
 * than present text macts writes:
 *
 * - Inside a claim's `evidence`, only the fields that quote the dictionary:
 *   `term` (a dictionary term as the dictionary writes it) and `statement`
 *   (a handler's description as the dictionary words it). A reader checks the
 *   claim against them. Everything else in evidence is provenance (bundle,
 *   versions, counts, error numbers, timestamps) that cannot name the
 *   mechanism, or prose the manifest author wrote: a curated `note`, an
 *   absent-reads `reason`, a live observation's `expression`. The generator
 *   renders that prose into field documentation, so it follows the rule.
 * - `extraction`, at the top of a manifest: notes on how the manifest was
 *   made, for its maintainers. Nothing renders them.
 *
 * `AppManifestSchema` applies the rule, so a manifest that breaks it
 * neither loads nor generates.
 *
 * @packageDocumentation
 */

/**
 * Terms that name the automation mechanism macts drives apps through.
 *
 * Matched case-insensitively anywhere in a string, so plurals and compounds
 * ("AppleScripts", "osascript's") match too. Ordinary words such as "script"
 * or "JavaScript" do not: an app can be about scripts without its text
 * describing how macts reaches it. This is the one definition every
 * no-leak check shares, from manifest validation to the CLI's acceptance
 * tests.
 */
export const MECHANISM_TERMS = /applescript|jxa|osascript|javascript for automation/i

/** A place where a manifest's text names the automation mechanism. */
export interface MechanismTermIssue {
  /** What names the mechanism, where, and how to correct it. */
  readonly message: string
  /** Path to the offending string, or to the declaration a key names. */
  readonly path: (string | number)[]
}

/**
 * The field that holds a claim's evidence in any declaration, and the
 * manifest's top-level extraction notes. See the module comment.
 */
const EVIDENCE_FIELD = 'evidence'
const EXTRACTION_FIELD = 'extraction'

/**
 * The evidence fields that quote the app's dictionary verbatim, the only
 * evidence text exempt from the rule. Any other evidence field is checked.
 */
const DICTIONARY_QUOTE_FIELDS: ReadonlySet<string> = new Set(['term', 'statement'])

/**
 * Manifest fields whose values are maps from a declared name to a declaration.
 * A key inside one of these is a name (a resource, property or command named
 * `evidence`, say), so it is checked like any other declaration and never
 * mistaken for a provenance field.
 */
const DECLARATION_MAPS: ReadonlySet<string> = new Set([
  'resources',
  'properties',
  'inheritedClaims',
  'enums',
  'commands',
  'children',
  'roots',
  'variants',
  'permissions',
])

/** The mechanism term a string names, as written, or `undefined`. */
function namedTerm(text: string): string | undefined {
  return MECHANISM_TERMS.exec(text)?.[0]
}

/**
 * Every place a manifest's text names the automation mechanism, in document
 * order. Empty when the manifest follows the rule in the module comment.
 *
 * @param manifest - A manifest as parsed (any JSON-like value is accepted)
 */
export function findMechanismTermIssues(manifest: unknown): MechanismTermIssue[] {
  const issues: MechanismTermIssue[] = []
  const report = (term: string, path: (string | number)[], what: string): void => {
    issues.push({
      message: `${path.join('.')}: ${what} names the automation mechanism ("${term}"). macts surfaces say what the app does, never how macts reaches it: rewrite it without the term, or drop a clause that only concerns the mechanism. The dictionary's own words belong only in an evidence term or statement.`,
      path,
    })
  }
  const walk = (
    value: unknown,
    path: (string | number)[],
    inDeclarationMap: boolean,
    inEvidence: boolean
  ): void => {
    if (typeof value === 'string') {
      const term = namedTerm(value)
      if (term !== undefined) report(term, path, 'the text')
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        walk(item, [...path, index], false, inEvidence)
      })
      return
    }
    if (typeof value !== 'object' || value === null) return
    for (const [key, child] of Object.entries(value)) {
      if (inEvidence && DICTIONARY_QUOTE_FIELDS.has(key)) continue
      if (path.length === 0 && key === EXTRACTION_FIELD) continue
      const childPath = [...path, key]
      if (inDeclarationMap) {
        const term = namedTerm(key)
        if (term !== undefined) report(term, childPath, 'the name')
      }
      const enteringEvidence = !inDeclarationMap && key === EVIDENCE_FIELD
      walk(
        child,
        childPath,
        !inEvidence && !inDeclarationMap && DECLARATION_MAPS.has(key),
        inEvidence || enteringEvidence
      )
    }
  }
  walk(manifest, [], false, false)
  return issues
}
