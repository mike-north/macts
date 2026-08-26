/**
 * Unit tests for the approval-provider registration declaration.
 *
 * The declaration is a trust boundary: it names the single component allowed to
 * answer "may this held call run?". Parsing therefore validates rather than
 * trusts, and every malformed shape is reported as a structured issue instead
 * of silently defaulting.
 *
 * @see https://github.com/mike-north/macts/issues/107
 */

import { describe, expect, it } from 'vitest'
import {
  MAX_APPROVAL_TIMEOUT_MS,
  parseApprovalConfig,
  resolveApprovalConfigPath,
} from './approval-config.js'
import { DEFAULT_APPROVAL_TIMEOUT_MS } from './approval.js'

describe('parseApprovalConfig', () => {
  it('parses a minimal declaration and applies defaults', () => {
    const result = parseApprovalConfig({ provider: '@example/macts-approval' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({
      version: '1',
      provider: '@example/macts-approval',
      timeoutMs: DEFAULT_APPROVAL_TIMEOUT_MS,
      options: {},
    })
  })

  it('keeps an explicit timeout and passes provider options through untouched', () => {
    const result = parseApprovalConfig({
      version: '1',
      provider: '@example/macts-approval',
      timeoutMs: 45_000,
      options: { account: 'acct_123', nested: { relay: 'wss://example.test' } },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.timeoutMs).toBe(45_000)
    expect(result.data.options).toEqual({
      account: 'acct_123',
      nested: { relay: 'wss://example.test' },
    })
  })

  it('trims surrounding whitespace from the provider package name', () => {
    const result = parseApprovalConfig({ provider: '  @example/macts-approval  ' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.provider).toBe('@example/macts-approval')
  })

  it.each([
    ['a missing provider', {}],
    ['an empty provider', { provider: '' }],
    ['a whitespace-only provider', { provider: '   ' }],
    ['a non-string provider', { provider: 42 }],
  ])('rejects %s', (_label, input) => {
    const result = parseApprovalConfig(input)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((issue) => issue.path === 'provider')).toBe(true)
  })

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['fractional', 1.5],
    ['above the one-hour ceiling', MAX_APPROVAL_TIMEOUT_MS + 1],
  ])('rejects a %s timeout', (_label, timeoutMs) => {
    const result = parseApprovalConfig({ provider: '@example/macts-approval', timeoutMs })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((issue) => issue.path === 'timeoutMs')).toBe(true)
  })

  it('accepts a timeout exactly at the ceiling', () => {
    const result = parseApprovalConfig({
      provider: '@example/macts-approval',
      timeoutMs: MAX_APPROVAL_TIMEOUT_MS,
    })

    expect(result.success).toBe(true)
  })

  it('rejects an unknown top-level key rather than ignoring it', () => {
    // A typo like "timeout" (instead of "timeoutMs") must fail loudly: silently
    // ignoring it would leave the operator believing they set a bound.
    const result = parseApprovalConfig({ provider: '@example/macts-approval', timeout: 30_000 })

    expect(result.success).toBe(false)
  })

  it('labels a declaration-wide issue with a root marker, not an empty path', () => {
    // Zod reports unrecognized keys against the object itself, so the path is
    // empty. Rendered into a summary that reads ": Unrecognized key(s)...",
    // which looks like a formatting bug rather than a configuration error.
    const result = parseApprovalConfig({ provider: '@example/macts-approval', timeout: 30_000 })

    expect(result.success).toBe(false)
    if (result.success) return
    const issue = result.issues[0]
    expect(issue?.path).toBe('<root>')
    expect(issue?.path).not.toBe('')
  })

  it('labels a non-object declaration with the root marker too', () => {
    const result = parseApprovalConfig('not a declaration')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.every((issue) => issue.path.length > 0)).toBe(true)
  })

  it('rejects a future declaration version', () => {
    const result = parseApprovalConfig({ version: '2', provider: '@example/macts-approval' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues.some((issue) => issue.path === 'version')).toBe(true)
  })

  it.each([[null], [undefined], ['a string'], [[]]])('rejects %s as a declaration', (input) => {
    expect(parseApprovalConfig(input).success).toBe(false)
  })
})

describe('resolveApprovalConfigPath', () => {
  it('resolves alongside the active policy under the governance directory', () => {
    expect(resolveApprovalConfigPath('/Users/alice/.macts')).toBe(
      '/Users/alice/.macts/governance/approval.json'
    )
  })
})
