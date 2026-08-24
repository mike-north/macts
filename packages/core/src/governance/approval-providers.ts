/**
 * Built-in reference implementations of the HITL approval provider interface.
 *
 * These exist so the approval seam ({@link ./approval.js}) can be exercised
 * end-to-end — wiring, audit records, HTTP status codes — without installing a
 * real approval channel, and so provider authors have a minimal, correct shape
 * to copy.
 *
 * They ask **no human anything**. A static provider is never a substitute for a
 * real HITL channel: configuring one in production would turn every
 * `confirm-first` hold into an unattended, pre-decided answer.
 *
 * @packageDocumentation
 */

import type {
  ApprovalDecision,
  ApprovalProvider,
  ApprovalProviderCapabilities,
  ApprovalState,
} from './approval.js'

/**
 * Options for {@link createStaticApprovalProvider}.
 */
export interface StaticApprovalProviderOptions {
  /** The state this provider reports for every request. */
  readonly state: ApprovalState
  /**
   * Provider name used in logs and audit reasons.
   *
   * @defaultValue `'static'`
   */
  readonly name?: string
  /** Human-readable reason attached to every decision. */
  readonly reason?: string | undefined
  /** Opaque artifact attached to every decision, for testing the evidence slot. */
  readonly evidence?: unknown
  /**
   * Capability flags to advertise.
   *
   * @defaultValue both flags `false`
   */
  readonly capabilities?: ApprovalProviderCapabilities
}

/**
 * Create a provider that answers every request with the same fixed state.
 *
 * Intended for tests and for verifying that a deployment's approval wiring is
 * connected. With `state: 'rejected'` it is a fail-closed no-op: every
 * `confirm-first` call is denied and audited as `rejected`, which is the safe
 * placeholder while a real provider is being installed.
 *
 * @param options - Fixed state plus optional name, reason, evidence, and flags.
 * @returns A provider that never contacts a human.
 *
 * @example
 * ```typescript
 * import { createStaticApprovalProvider } from '@macts/core';
 *
 * // Fail-closed placeholder: every held call is denied.
 * const provider = createStaticApprovalProvider({ state: 'rejected' });
 * ```
 */
export function createStaticApprovalProvider(
  options: StaticApprovalProviderOptions
): ApprovalProvider {
  const {
    state,
    name = 'static',
    reason,
    evidence,
    capabilities = { supportsPolicySuggestions: false, supportsDistinctRouting: false },
  } = options

  const decision: ApprovalDecision = {
    state,
    ...(reason === undefined ? {} : { reason }),
    ...(evidence === undefined ? {} : { evidence }),
  }

  return {
    name,
    capabilities,
    requestApproval(): Promise<ApprovalDecision> {
      return Promise.resolve(decision)
    },
  }
}
