/**
 * Unit tests for the HITL approval provider interface and its fail-closed gate.
 *
 * The load-bearing property under test is that {@link seekApproval} returns
 * `approved: true` for **exactly one** input — a provider that explicitly
 * resolves `state: 'approved'` — and denies for every other outcome a
 * third-party provider can produce: an explicit rejection, a provider-reported
 * timeout, a hang past the bound, a thrown error, and a malformed response.
 *
 * @see https://github.com/mike-north/macts/issues/107
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ApprovalDecision,
  ApprovalDeniedOutcome,
  ApprovalOutcome,
  ApprovalProvider,
  ApprovalProviderCapabilities,
  ApprovalRequest,
  ApprovalRequestContext,
} from './approval.js'
import { DEFAULT_APPROVAL_TIMEOUT_MS, isApprovalState, seekApproval } from './approval.js'
import { createStaticApprovalProvider } from './approval-providers.js'
import { FIXED_TIMESTAMP, makeAppRule } from './policy-test-fixtures.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NO_CAPABILITIES: ApprovalProviderCapabilities = {
  supportsPolicySuggestions: false,
  supportsDistinctRouting: false,
}

/** Build a fully-populated approval request with an injected, fixed timestamp. */
function makeRequest(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: 'req-0001',
    permission: 'calendar:events:create',
    risk: 'write',
    identity: { apiKeyId: 'key-001', apiKeyName: 'assistant' },
    argsSummary: 'summary: Standup; password: [redacted]',
    rule: {
      source: 'app',
      disposition: 'confirm-first',
      appRule: makeAppRule({ app: 'calendar', disposition: 'confirm-first' }),
    },
    reason: 'App rule "calendar" requires confirmation for calendar:events:create',
    timeoutMs: 1_000,
    requestedAt: FIXED_TIMESTAMP,
    layer: 'host',
    ...overrides,
  }
}

/** Build a provider from a bare `requestApproval` implementation. */
function makeProvider(
  requestApproval: ApprovalProvider['requestApproval'],
  capabilities: ApprovalProviderCapabilities = NO_CAPABILITIES,
  name = 'test-provider'
): ApprovalProvider {
  return { name, capabilities, requestApproval }
}

/**
 * Assert an outcome denied the call, and narrow it to the denied arm so its
 * failure category can be inspected.
 */
function expectDenied(outcome: ApprovalOutcome): ApprovalDeniedOutcome {
  expect(outcome.approved).toBe(false)
  if (outcome.approved) {
    throw new Error('expected a denied outcome')
  }
  return outcome
}

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('seekApproval: approved', () => {
  it('approves only on an explicit "approved" state, carrying the provider reason', async () => {
    const provider = makeProvider(() =>
      Promise.resolve<ApprovalDecision>({ state: 'approved', reason: 'Looks fine to me' })
    )

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.approved).toBe(true)
    expect(outcome.state).toBe('approved')
    // A provider-authored reason is copy it chose to show a human, so it is
    // safe on both sides of the boundary.
    expect(outcome.reason).toBe('Looks fine to me')
    expect(outcome.auditReason).toBe('Looks fine to me')
  })

  it('synthesizes a reason naming the permission when the provider omits one', async () => {
    const provider = makeProvider(() => Promise.resolve<ApprovalDecision>({ state: 'approved' }))

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.reason).toContain('calendar:events:create')
    expect(outcome.reason).toContain('test-provider')
  })

  it('passes the request through to the provider unchanged, with an abort signal', async () => {
    let seen: ApprovalRequest | undefined
    let context: ApprovalRequestContext | undefined
    const provider = makeProvider((request, ctx) => {
      seen = request
      context = ctx
      return Promise.resolve<ApprovalDecision>({ state: 'approved' })
    })
    const request = makeRequest()

    await seekApproval({ provider, request })

    expect(seen).toBe(request)
    expect(context?.signal.aborted).toBe(false)
  })

  it('forwards an opaque evidence artifact without interpreting it', async () => {
    const evidence = { verdict: 'signed-blob', alg: 'EdDSA' }
    const provider = makeProvider(() =>
      Promise.resolve<ApprovalDecision>({ state: 'approved', evidence })
    )

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.evidence).toBe(evidence)
  })
})

// ---------------------------------------------------------------------------
// Rejection paths (every one of these must deny)
// ---------------------------------------------------------------------------

describe('seekApproval: rejection paths', () => {
  it('denies on an explicit "rejected" state', async () => {
    const provider = makeProvider(() =>
      Promise.resolve<ApprovalDecision>({ state: 'rejected', reason: 'Not right now' })
    )

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.approved).toBe(false)
    expect(outcome.state).toBe('rejected')
    expect(outcome.reason).toBe('Not right now')
  })

  it('denies on a provider-reported "timeout" state, keeping the state distinct', async () => {
    const provider = makeProvider(() => Promise.resolve<ApprovalDecision>({ state: 'timeout' }))

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.approved).toBe(false)
    // Distinct from 'rejected': "nobody answered" is not "a human said no".
    expect(outcome.state).toBe('timeout')
    expect(outcome.reason).toContain('fail-closed')
  })

  it('denies when the provider does not respond within the bound, and aborts it', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const provider = makeProvider(
      (_request, ctx) =>
        new Promise<ApprovalDecision>(() => {
          signal = ctx.signal
          // Never settles: simulates a human who never answers.
        })
    )

    const pending = seekApproval({ provider, request: makeRequest({ timeoutMs: 1_000 }) })
    await vi.advanceTimersByTimeAsync(1_000)
    const outcome = await pending

    expect(outcome.approved).toBe(false)
    expect(outcome.state).toBe('timeout')
    expect(outcome.reason).toContain('1000ms')
    expect(outcome.reason).toContain('calendar:events:create')
    // The provider is told to stop waiting and retract its prompt.
    expect(signal?.aborted).toBe(true)
  })

  it('does not leave the timeout timer pending after a decision arrives', async () => {
    vi.useFakeTimers()
    const provider = makeProvider(() => Promise.resolve<ApprovalDecision>({ state: 'approved' }))

    await seekApproval({ provider, request: makeRequest({ timeoutMs: 60_000 }) })

    expect(vi.getTimerCount()).toBe(0)
  })

  it('denies when the provider rejects, recording the failure separately', async () => {
    const provider = makeProvider(() => Promise.reject(new Error('relay unreachable')))

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.approved).toBe(false)
    expect(outcome.state).toBe('rejected')
    // A broken channel is distinguishable from a human declining.
    expect(expectDenied(outcome).failure).toBe('provider-error')
  })

  it('denies when the provider throws synchronously instead of returning a promise', async () => {
    const provider = makeProvider(() => {
      throw new Error('provider is misconfigured')
    })

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.approved).toBe(false)
    expect(outcome.state).toBe('rejected')
    expect(expectDenied(outcome).failure).toBe('provider-error')
  })

  it.each([
    ['a missing state', {}],
    ['an unrecognized state', { state: 'escalated' }],
    ['a non-string state', { state: 42 }],
    ['null', null],
    ['a bare string', 'approved'],
    // Optional fields are part of the trust boundary too: a non-string reason
    // would otherwise reach an audit record and an HTTP body as "[object
    // Object]".
    ['a non-string reason', { state: 'approved', reason: { text: 'ok' } }],
    ['a numeric reason', { state: 'rejected', reason: 42 }],
    ['a non-object policy suggestion', { state: 'approved', policySuggestion: 'allow it' }],
    [
      'a policy suggestion with a non-string permission',
      { state: 'approved', policySuggestion: { permission: 1, disposition: 'allowed' } },
    ],
    [
      'a policy suggestion with an unknown disposition',
      { state: 'approved', policySuggestion: { permission: 'a:b:c', disposition: 'maybe' } },
    ],
    [
      'a policy suggestion with a non-string rationale',
      {
        state: 'approved',
        policySuggestion: { permission: 'a:b:c', disposition: 'allowed', rationale: 7 },
      },
    ],
  ])('denies when the provider returns %s', async (_label, value) => {
    const provider = makeProvider(
      () => Promise.resolve(value as unknown as ApprovalDecision),
      // Declared support, so a malformed suggestion is not merely dropped —
      // it must fail the decision outright.
      { supportsPolicySuggestions: true, supportsDistinctRouting: false }
    )

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.approved).toBe(false)
    expect(outcome.state).toBe('rejected')
    expect(expectDenied(outcome).failure).toBe('malformed-response')
  })

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['NaN', Number.NaN],
  ])('denies without asking the provider when the timeout is %s', async (_label, timeoutMs) => {
    let called = false
    const provider = makeProvider(() => {
      called = true
      return Promise.resolve<ApprovalDecision>({ state: 'approved' })
    })

    const outcome = await seekApproval({ provider, request: makeRequest({ timeoutMs }) })

    expect(called).toBe(false)
    expect(outcome.approved).toBe(false)
    expect(outcome.state).toBe('timeout')
  })
})

// ---------------------------------------------------------------------------
// Client-safe vs. operator-only explanations
// ---------------------------------------------------------------------------

describe('seekApproval: reason disclosure', () => {
  /** A provider exception carrying operator-only connection details. */
  const LEAKY_MESSAGE =
    'POST https://relay.internal.example/approvals failed: 401 (authorization: Bearer sk-live-abc123)'

  it('keeps a provider exception out of the client-safe reason', async () => {
    const provider = makeProvider(() => Promise.reject(new Error(LEAKY_MESSAGE)))

    const outcome = await seekApproval({ provider, request: makeRequest() })

    // Any authenticated caller can trip a confirm-first rule, so the reason
    // they receive must not carry relay URLs, tokens, or headers.
    expect(outcome.reason).not.toContain('relay.internal.example')
    expect(outcome.reason).not.toContain('sk-live-abc123')
    expect(outcome.reason).not.toContain('authorization')
    // It still says enough to act on: which capability, and what went wrong.
    expect(outcome.reason).toContain('calendar:events:create')
    expect(outcome.reason).toContain('provider-error')
  })

  it('keeps the full provider exception in the operator-only audit reason', async () => {
    const provider = makeProvider(() => Promise.reject(new Error(LEAKY_MESSAGE)))

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.auditReason).toContain(LEAKY_MESSAGE)
    expect(outcome.auditReason).toContain('test-provider')
  })

  it('does not leak the provider name or detail through a malformed response', async () => {
    const provider = makeProvider(() =>
      Promise.resolve({
        state: 'approved',
        reason: { secret: 'internal' },
      } as unknown as ApprovalDecision)
    )

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.reason).toContain('malformed-response')
    expect(outcome.reason).not.toContain('internal')
  })

  it('carries the same explanation on both sides when a human decided', async () => {
    const provider = makeProvider(() =>
      Promise.resolve<ApprovalDecision>({ state: 'rejected', reason: 'Not during a release' })
    )

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.reason).toBe('Not during a release')
    expect(outcome.auditReason).toBe('Not during a release')
  })

  it('carries the same explanation on both sides when nobody answered', async () => {
    const provider = makeProvider(() => Promise.resolve<ApprovalDecision>({ state: 'timeout' }))

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.auditReason).toBe(outcome.reason)
    expect(outcome.reason).toContain('fail-closed')
  })
})

// ---------------------------------------------------------------------------
// Capability flags
// ---------------------------------------------------------------------------

describe('seekApproval: capability flags', () => {
  const suggestion = { permission: 'calendar:events:*', disposition: 'allowed' } as const

  it('drops a policy suggestion from a provider that did not declare support', async () => {
    const provider = makeProvider(() =>
      Promise.resolve<ApprovalDecision>({ state: 'approved', policySuggestion: suggestion })
    )

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.policySuggestion).toBeUndefined()
  })

  it('forwards a policy suggestion from a provider that declared support', async () => {
    const provider = makeProvider(
      () => Promise.resolve<ApprovalDecision>({ state: 'approved', policySuggestion: suggestion }),
      { supportsPolicySuggestions: true, supportsDistinctRouting: false }
    )

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.policySuggestion).toEqual(suggestion)
  })
})

// ---------------------------------------------------------------------------
// State guard
// ---------------------------------------------------------------------------

describe('isApprovalState', () => {
  it.each(['approved', 'rejected', 'timeout'])('accepts %s', (value) => {
    expect(isApprovalState(value)).toBe(true)
  })

  it.each([['escalated'], [''], [null], [undefined], [42], [{ state: 'approved' }]])(
    'rejects %s',
    (value) => {
      expect(isApprovalState(value)).toBe(false)
    }
  )
})

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('DEFAULT_APPROVAL_TIMEOUT_MS', () => {
  it('is two minutes', () => {
    expect(DEFAULT_APPROVAL_TIMEOUT_MS).toBe(120_000)
  })
})

// ---------------------------------------------------------------------------
// Reference provider
// ---------------------------------------------------------------------------

describe('createStaticApprovalProvider', () => {
  it('answers every request with the configured state', async () => {
    const provider = createStaticApprovalProvider({ state: 'rejected', reason: 'no channel' })

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.approved).toBe(false)
    expect(outcome.state).toBe('rejected')
    expect(outcome.reason).toBe('no channel')
  })

  it('declares no optional capabilities by default', () => {
    const provider = createStaticApprovalProvider({ state: 'approved' })

    expect(provider.capabilities).toEqual({
      supportsPolicySuggestions: false,
      supportsDistinctRouting: false,
    })
    expect(provider.name).toBe('static')
  })

  it('attaches the configured evidence artifact to its decision', async () => {
    const provider = createStaticApprovalProvider({ state: 'approved', evidence: 'artifact' })

    const outcome = await seekApproval({ provider, request: makeRequest() })

    expect(outcome.evidence).toBe('artifact')
  })
})
