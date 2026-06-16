/**
 * Argument-redaction helper for audit records.
 *
 * Capability call arguments may contain sensitive values (passwords, tokens,
 * API keys, etc.). Before those arguments are stored in an audit record they
 * must be summarised and sanitised: sensitive values replaced with a stable
 * placeholder and large/non-scalar values collapsed to a safe summary so the
 * `argsSummary` field in an {@link AuditRecord} is always safe to persist and
 * display.
 *
 * This module is pure and has no I/O side-effects — it transforms a
 * `Record<string, unknown>` into a human-readable `string`. Storing the
 * resulting summary is handled by the caller (audit construction) and persisted
 * by the writer ({@link ./writer.js}).
 *
 * @packageDocumentation
 */

/**
 * The placeholder written in place of a sensitive argument value.
 */
export const REDACTED_PLACEHOLDER = '[redacted]'

/**
 * Default set of key names (compared case-insensitively) whose values are
 * unconditionally replaced with {@link REDACTED_PLACEHOLDER}.
 *
 * The list covers the most common secrets that appear as call arguments. Callers
 * may extend it by passing `extraSensitiveKeys` to {@link redactArgs}.
 */
export const DEFAULT_SENSITIVE_KEYS: readonly string[] = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'key',
  'credential',
  'credentials',
]

/**
 * Determine whether a key name should be treated as sensitive.
 *
 * Comparison is case-insensitive and the default sensitive-key list is always
 * checked; `extraSensitiveKeys` (if provided) are merged in.
 *
 * @param key - The argument key to test.
 * @param extraSensitiveKeys - Additional key names to treat as sensitive.
 * @returns `true` if the key should have its value redacted.
 */
export function isSensitiveKey(key: string, extraSensitiveKeys: readonly string[] = []): boolean {
  const normalized = key.toLowerCase()
  const allSensitive = [
    ...DEFAULT_SENSITIVE_KEYS,
    ...extraSensitiveKeys.map((k) => k.toLowerCase()),
  ]
  return allSensitive.includes(normalized)
}

/**
 * Summarise a non-sensitive argument value for inclusion in an audit record.
 *
 * The summary is intentionally lossy: large objects/arrays are truncated to
 * avoid dumping raw data. Scalars are rendered directly. `null` and `undefined`
 * are rendered as their string forms so the summary is always a non-empty string.
 *
 * @param value - The raw argument value to summarise.
 * @returns A human-readable, bounded-length summary.
 */
function summariseValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  switch (typeof value) {
    case 'string':
      // Truncate long strings to avoid large blobs in audit records.
      return value.length > 80 ? `${value.slice(0, 80)}…` : value
    case 'number':
    case 'boolean':
      return String(value)
    case 'bigint':
      return `${value.toString()}n`
    case 'object':
      if (Array.isArray(value)) {
        return `[array(${String(value.length)})]`
      }
      // Plain objects — emit key count rather than contents.
      return `[object(${String(Object.keys(value as Record<string, unknown>).length)} keys)]`
    default:
      // symbol, function, etc.
      return `[${typeof value}]`
  }
}

/**
 * Options for {@link redactArgs}.
 */
export interface RedactArgsOptions {
  /**
   * Additional key names (compared case-insensitively) to treat as sensitive.
   * These are merged with {@link DEFAULT_SENSITIVE_KEYS}; duplicate entries are
   * harmless.
   */
  readonly extraSensitiveKeys?: readonly string[]
}

/**
 * Redact sensitive values from a capability-call argument map and return a
 * human-readable summary string suitable for {@link AuditRecordInput.argsSummary}.
 *
 * Sensitive key names (matched case-insensitively against
 * {@link DEFAULT_SENSITIVE_KEYS} plus any `extraSensitiveKeys`) have their
 * values replaced with {@link REDACTED_PLACEHOLDER}. All other values are
 * summarised safely (scalars inline, large objects/arrays collapsed to a size
 * hint) so the record never contains raw bulk data.
 *
 * An empty argument map produces the string `"(no arguments)"` so the field
 * is always non-empty and audit-record consumers can distinguish "no args" from
 * "redaction removed everything".
 *
 * Key ordering in the output follows `Object.entries` order (i.e. insertion
 * order of the original map).
 *
 * @param args - The raw capability-call arguments.
 * @param options - Optional configuration (extra sensitive key names).
 * @returns A human-readable, redacted summary string.
 *
 * @example
 * ```typescript
 * redactArgs({ calendar: 'Work', password: 'hunter2' })
 * // → "calendar: Work; password: [redacted]"
 * ```
 */
export function redactArgs(args: Record<string, unknown>, options: RedactArgsOptions = {}): string {
  const entries = Object.entries(args)
  if (entries.length === 0) {
    return '(no arguments)'
  }

  const { extraSensitiveKeys = [] } = options

  const parts = entries.map(([key, value]) => {
    const summary = isSensitiveKey(key, extraSensitiveKeys)
      ? REDACTED_PLACEHOLDER
      : summariseValue(value)
    return `${key}: ${summary}`
  })

  return parts.join('; ')
}
