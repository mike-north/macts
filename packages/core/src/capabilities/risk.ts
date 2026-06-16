/**
 * Deterministic risk classification for capabilities.
 *
 * Every capability (current and future) is assigned a machine-readable risk
 * class derived from the *semantics* of its operation. Classification is a pure
 * function of the operation name and command metadata, so it is reproducible
 * for any app without hand-annotating manifests. A manifest may still override
 * the derived value (lossless-plus), but the override is optional.
 *
 * Risk classes (see VISION.md §7.1 — "Whether it reads, writes, deletes,
 * sends, executes, or changes system state"):
 *
 * - `read`          — observes state without mutating it (list/get/show/find)
 * - `write`         — creates or mutates persistent state (create/update/move)
 * - `delete`        — destroys persistent state (delete/remove/trash/purge)
 * - `send`          — transmits data outward, often irreversible and
 *                     exfiltration-relevant (send/email/post/share/invite)
 * - `execute`       — runs arbitrary code or scripts inside an app
 *                     (do-script/run/eval/compile)
 * - `system-change` — alters OS / app lifecycle / device state
 *                     (quit/restart/install/mount/eject/sleep/shutdown)
 *
 * @packageDocumentation
 */

import type { Command } from '../manifest/schemas/command.js'

/**
 * The closed set of risk classifications a capability can carry.
 *
 * Ordered from least to most sensitive for stable, deterministic sorting.
 */
export const RISK_CLASSES = ['read', 'write', 'delete', 'send', 'execute', 'system-change'] as const

/**
 * A single risk classification value.
 */
export type RiskClass = (typeof RISK_CLASSES)[number]

/**
 * Severity ranking used for deterministic ordering and "most sensitive wins"
 * resolution. Higher numbers are more sensitive.
 */
const RISK_SEVERITY: Record<RiskClass, number> = {
  read: 0,
  write: 1,
  delete: 2,
  send: 3,
  execute: 4,
  'system-change': 5,
}

/**
 * Compare two risk classes by severity (ascending). Useful for deterministic
 * sorting of capabilities by sensitivity.
 *
 * @param a - First risk class
 * @param b - Second risk class
 * @returns Negative if `a` is less sensitive, positive if more, 0 if equal
 */
export function compareRisk(a: RiskClass, b: RiskClass): number {
  return RISK_SEVERITY[a] - RISK_SEVERITY[b]
}

/**
 * Type guard: is the given string a valid {@link RiskClass}?
 *
 * @param value - Candidate value
 * @returns True if `value` is one of the {@link RISK_CLASSES}
 */
export function isRiskClass(value: unknown): value is RiskClass {
  return typeof value === 'string' && (RISK_CLASSES as readonly string[]).includes(value)
}

/**
 * Default classification for an operation whose intent cannot be determined.
 *
 * The safe default is the most conservative *gateable* class rather than the
 * least sensitive one: misclassifying a mutating or code-running operation as
 * `read` would silently bypass governance, whereas over-classifying an unknown
 * operation as `execute` only prompts for explicit escalation. We therefore
 * fail safe toward `execute`.
 */
export const DEFAULT_RISK: RiskClass = 'execute'

/**
 * Keyword tables mapping operation-name *word tokens* to a risk class. Tokens
 * are matched against the words of the operation name (split on camelCase
 * boundaries and non-alphanumeric separators), NOT as raw substrings — so
 * `goForward` (tokenized to `['go', 'forward']`) does not match
 * the `send` token `forward`, and `shouldEnableAction` does not match the
 * `system-change` token `enable` simply by sharing a substring.
 *
 * Each keyword matches when it equals a whole token, so `listEvents`
 * (`['list','events']`), `getEvent`, and `events.list` all map to `read`. The
 * multi-word execute keywords (e.g. `doscript`) additionally match the joined
 * form of the token sequence — see {@link COMPOUND_KEYWORDS}.
 */
const RISK_KEYWORDS: Record<Exclude<RiskClass, never>, readonly string[]> = {
  // Outward transmission — checked early because words like "send"/"share"
  // imply an external side effect regardless of any read/write connotation.
  // NOTE: `forward` is handled separately (see LEADING_ONLY_KEYWORDS) because as
  // a non-leading token it almost always names navigation (`goForward`,
  // `stepForward`), not transmission.
  send: ['send', 'email', 'mail', 'mailto', 'post', 'publish', 'share', 'invite', 'reply'],
  // Arbitrary code / script execution inside the target app.
  execute: ['execute', 'exec', 'eval', 'evaluate', 'compile', 'run', 'invoke'],
  // OS / app lifecycle and device state changes.
  'system-change': [
    'quit',
    'restart',
    'reboot',
    'reload',
    'relaunch',
    'launch',
    'activate',
    'install',
    'uninstall',
    'mount',
    'unmount',
    'eject',
    'sleep',
    'shutdown',
    'logout',
    'enable',
    'disable',
    'sync',
    'synchronize',
  ],
  // Destruction of persistent state.
  delete: ['delete', 'remove', 'trash', 'purge', 'empty', 'clear', 'discard', 'erase'],
  // Creation / mutation of persistent state.
  write: [
    'create',
    'update',
    'add',
    'edit',
    'modify',
    'write',
    'save',
    'set',
    'move',
    'duplicate',
    'copy',
    'rename',
    'insert',
    'append',
    'make',
    'new',
    'import',
    'upload',
  ],
  // Pure observation.
  read: [
    'list',
    'get',
    'show',
    'find',
    'search',
    'read',
    'view',
    'fetch',
    'query',
    'count',
    'exists',
    'export',
    'open',
    'select',
  ],
}

/**
 * Keywords that only signal their risk class when they appear as the *leading*
 * (first) token of an operation name. `forward` is the motivating case: the
 * bare operation `forward` and `forwardMessage` are genuine outbound `send`
 * operations (e.g. Mail forwards an email), but `goForward` / `stepForward` are
 * navigation verbs where `forward` is a non-leading direction word. Keying on
 * the leading verb keeps the real send semantics while letting navigation fall
 * through to the safe default.
 */
const LEADING_ONLY_KEYWORDS: Partial<Record<RiskClass, readonly string[]>> = {
  send: ['forward'],
}

/**
 * Multi-word keywords that name a single verb only when their tokens are
 * joined (e.g. `do-script` / `doScript` → tokens `['do','script']` → joined
 * `doscript`, or `setVolume` → `['set','volume']` → joined `setvolume`).
 * Matched against the concatenation of all tokens so the
 * camelCase/separator-aware tokenizer doesn't lose them, and so they win over
 * the generic single-word token they contain (`set` would otherwise classify
 * `setVolume` as `write`).
 */
const COMPOUND_KEYWORDS: Partial<Record<RiskClass, readonly string[]>> = {
  // Script/code execution spelled as two words.
  execute: ['doscript', 'dojavascript', 'runscript'],
  // Device/app-state / lifecycle changes spelled as two words (e.g. `shutDown`,
  // `logOut`, `setVolume`), which the word tokenizer would otherwise split apart.
  'system-change': ['setvolume', 'setbrightness', 'switchview', 'shutdown', 'logout'],
}

/**
 * Predicate prefixes that mark an operation as a boolean *query* rather than a
 * mutation. When the leading token is one of these, the operation observes
 * state (e.g. `shouldEnableAction`, `canDelete`, `isRunning`) and is classified
 * as {@link RiskClass} `read`, regardless of the mutating-looking tokens that
 * follow. Matched as whole leading tokens (not substrings) so `cancel` is not
 * mistaken for the predicate `can`.
 */
const PREDICATE_PREFIXES: ReadonlySet<string> = new Set([
  'should',
  'can',
  'is',
  'are',
  'was',
  'were',
  'has',
  'have',
  'had',
  'will',
  'does',
  'did',
  'needs',
])

/**
 * Resolution order for keyword tables. Earlier classes win, so an operation
 * whose name contains both a write-ish and a send-ish token (e.g.
 * `createInvite`) classifies by the more sensitive intent. Ordering is from
 * most to least sensitive *intent specificity*, NOT raw severity, because the
 * verb that names the operation is the strongest signal.
 */
const RESOLUTION_ORDER: readonly RiskClass[] = [
  'send',
  'execute',
  'system-change',
  'delete',
  'write',
  'read',
]

/**
 * Split an operation name into lowercased word tokens, honoring camelCase /
 * PascalCase boundaries and non-alphanumeric separators. This is what makes
 * classification word-aware instead of naive-substring: a `forward` direction
 * word in `goForward` becomes its own token rather than a substring of the
 * whole name.
 *
 * Examples:
 * - `goForward`     → `['go', 'forward']`
 * - `do-javascript` → `['do', 'javascript']`
 * - `listEvents`    → `['list', 'events']`
 * - `events.list`   → `['events', 'list']`
 * - `setHTTPProxy`  → `['set', 'http', 'proxy']`
 *
 * @param operationName - Raw operation name in any casing/separator style
 * @returns Lowercased word tokens (empty array for symbol-only input)
 */
function tokenizeOperation(operationName: string): string[] {
  return (
    operationName
      // Insert a separator at lower→upper and acronym→Word boundaries so
      // camelCase and PascalCase split into words.
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // Split on any run of non-alphanumeric characters.
      .split(/[^a-zA-Z0-9]+/)
      .map((part) => part.toLowerCase())
      .filter((part) => part.length > 0)
  )
}

/**
 * Classify a risk purely from an operation name, using the keyword tables.
 *
 * This is the deterministic core: given the same operation name it always
 * returns the same risk class. Classification is word-token aware (it splits
 * the operation name into words on camelCase boundaries and separators) so
 * navigation verbs (`goForward`, `stepForward`)
 * and predicate queries (`shouldEnableAction`, `canDelete`) are not
 * misclassified by incidental substrings. Unknown / ambiguous names resolve to
 * {@link DEFAULT_RISK}.
 *
 * @param operationName - The operation name (command name or permission
 *   operation segment), in any casing/separator style
 * @returns The derived {@link RiskClass}
 */
export function classifyRiskFromOperation(operationName: string): RiskClass {
  const tokens = tokenizeOperation(operationName)
  if (tokens.length === 0) {
    return DEFAULT_RISK
  }

  // Predicate-prefixed operations (e.g. `shouldEnableAction`, `canDelete`,
  // `isRunning`) are boolean queries: they observe state without mutating it.
  // Classify them as `read` before keyword matching so the mutating-looking
  // tokens that follow (`enable`, `delete`, …) don't over-gate a read-only check.
  const leadingToken = tokens[0]
  if (leadingToken !== undefined && PREDICATE_PREFIXES.has(leadingToken)) {
    return 'read'
  }

  const tokenSet = new Set(tokens)
  const joined = tokens.join('')

  for (const riskClass of RESOLUTION_ORDER) {
    // Whole-token keywords.
    for (const keyword of RISK_KEYWORDS[riskClass]) {
      if (tokenSet.has(keyword)) {
        return riskClass
      }
    }
    // Compound keywords match the joined token sequence (e.g. `doscript`).
    for (const keyword of COMPOUND_KEYWORDS[riskClass] ?? []) {
      if (joined.includes(keyword)) {
        return riskClass
      }
    }
    // Leading-only keywords match only when they are the first token.
    for (const keyword of LEADING_ONLY_KEYWORDS[riskClass] ?? []) {
      if (leadingToken === keyword) {
        return riskClass
      }
    }
  }

  return DEFAULT_RISK
}

/**
 * Classify the risk of a manifest {@link Command}.
 *
 * Precedence:
 * 1. An explicit, valid `risk` on the command (manifest override / lossless-plus).
 * 2. Otherwise, the risk derived from the command's operation name via
 *    {@link classifyRiskFromOperation}.
 *
 * @param command - The manifest command
 * @returns The resolved {@link RiskClass}
 */
export function classifyCommandRisk(command: Command): RiskClass {
  if (isRiskClass(command.risk)) {
    return command.risk
  }
  return classifyRiskFromOperation(command.name)
}
