/**
 * Type-level alignment between governance vocabulary in `@macts/core` and the
 * structured error details in `@macts/contracts`.
 *
 * The contracts package cannot depend on core, so error details restate two
 * small governance vocabularies (policy layers and approval denial states).
 * These assertions make any divergence a compile error. They use only
 * constructs that are valid TypeScript, because `src/**` is also compiled by
 * `tsc --noEmit`.
 */

import type { ApprovalRejectionState, PolicyLayerName } from '@macts/contracts'
import type { ApprovalDeniedState } from '../governance/approval.js'
import type { PolicyLayer } from '../governance/composition.js'

/** `true` only when `A` and `B` are mutually assignable. */
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export const policyLayersAlign: MutuallyAssignable<PolicyLayer, PolicyLayerName> = true
export const approvalDenialStatesAlign: MutuallyAssignable<
  ApprovalDeniedState,
  ApprovalRejectionState
> = true
