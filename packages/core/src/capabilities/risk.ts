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
 * Keyword tables mapping operation-name tokens to a risk class. Tokens are
 * matched against the lowercased operation name. Tables are ordered by
 * specificity in {@link classifyRiskFromOperation} so that, e.g. `delete`
 * (which contains no `read`/`write` token) resolves before generic verbs.
 *
 * Tokens are substrings, matched case-insensitively, so `listEvents`,
 * `getEvent`, and `events.list` all map to `read`.
 */
const RISK_KEYWORDS: Record<Exclude<RiskClass, never>, readonly string[]> = {
  // Outward transmission — checked early because words like "send"/"share"
  // imply an external side effect regardless of any read/write connotation.
  send: ['send', 'email', 'mail', 'post', 'publish', 'share', 'invite', 'reply', 'forward'],
  // Arbitrary code / script execution inside the target app.
  execute: ['doscript', 'dojavascript', 'runscript', 'execute', 'eval', 'compile', 'run', 'invoke'],
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
    'setvolume',
    'setbrightness',
    'enable',
    'disable',
    'switchview',
    'sync',
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
 * Normalize an operation name to a token suitable for substring keyword
 * matching: lowercased with non-alphanumeric separators stripped.
 *
 * @param operationName - Raw operation name (e.g. `do-javascript`, `listEvents`)
 * @returns Lowercased alphanumeric token (e.g. `dojavascript`, `listevents`)
 */
function normalizeOperation(operationName: string): string {
  return operationName.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Classify a risk purely from an operation name, using the keyword tables.
 *
 * This is the deterministic core: given the same operation name it always
 * returns the same risk class. Unknown / ambiguous names resolve to
 * {@link DEFAULT_RISK}.
 *
 * @param operationName - The operation name (command name or permission
 *   operation segment), in any casing/separator style
 * @returns The derived {@link RiskClass}
 */
export function classifyRiskFromOperation(operationName: string): RiskClass {
  const token = normalizeOperation(operationName)
  if (token.length === 0) {
    return DEFAULT_RISK
  }

  for (const riskClass of RESOLUTION_ORDER) {
    for (const keyword of RISK_KEYWORDS[riskClass]) {
      if (token.includes(keyword)) {
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
