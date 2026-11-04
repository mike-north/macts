/**
 * This Mac's governance: the single definition of the governance context a
 * host enforces when nobody supplies one explicitly.
 *
 * The local SDK client and the HTTP server both default to it, so a call is
 * governed the same way whichever of them it arrives through. It composes the
 * pieces each surface would otherwise assemble on its own:
 *
 * - the active host policy (`<macts-home>/governance/policy.json`);
 * - the configured human-in-the-loop approval gate
 *   (`<macts-home>/governance/approval.json`), when one is registered;
 * - the per-key policy resolver over the key store;
 * - a JSON-lines audit writer at `<macts-home>/governance/audit.jsonl`.
 *
 * ## Missing versus malformed
 *
 * - A **missing** policy file is not an error. It resolves to the documented
 *   default that `loadActivePolicy` returns, so a first run works. The key's
 *   own permissions still gate every call before governance is consulted.
 * - A **malformed or unreadable** policy file or approval registration makes
 *   loading fail. A runtime given this loader then denies every call that
 *   passes the permission check with `InternalError`; nothing falls back to
 *   allowing everything. A caller without the operation's permission is still
 *   answered `PermissionDeniedError`; its `permission-denied` record cannot be
 *   written without the audit log, so the failure is logged instead.
 * - The audit writer is always present, so every decision is recorded. A
 *   record that cannot be written denies the call it describes with
 *   `InternalError`, except a `permission-denied` record: that caller is
 *   still answered `PermissionDeniedError`, and the failure is logged.
 *
 * @packageDocumentation
 */

import { join } from 'node:path'
import { createFileAuditWriter } from '@macts/core'
import { getMactsHome } from '../paths.js'
import { loadActivePolicy } from './active-policy.js'
import { loadApprovalGate } from './approval-provider.js'
import type { GovernanceContext } from './context.js'
import { createStoredKeyPolicyResolver } from './key-policy.js'

/**
 * Resolve the absolute path of this Mac's governance audit log.
 *
 * @remarks
 * The log sits beside the policy and approval registration it records
 * decisions for: `<macts-home>/governance/audit.jsonl`, one JSON record per
 * line.
 *
 * @returns Absolute path to the audit log.
 */
export function getAuditLogPath(): string {
  return join(getMactsHome(), 'governance', 'audit.jsonl')
}

/**
 * Overrides for where {@link loadHostGovernance} reads and writes. Each
 * defaults to its location under `MACTS_HOME`; overriding is for tests and
 * custom installs.
 */
export interface LoadHostGovernanceOptions {
  /**
   * The active policy file.
   *
   * @defaultValue `getActivePolicyPath()`
   */
  readonly policyPath?: string
  /**
   * The approval provider registration.
   *
   * @defaultValue `getApprovalConfigPath()`
   */
  readonly approvalConfigPath?: string
  /**
   * The audit log every governance decision is appended to.
   *
   * @defaultValue {@link getAuditLogPath}
   */
  readonly auditLogPath?: string
}

/**
 * Load the governance context this Mac enforces.
 *
 * @remarks
 * Composes the active host policy, the approval gate when one is registered,
 * the stored per-key policy resolver, and a file audit writer. A missing policy
 * file yields the default policy; a malformed or unreadable policy file or
 * approval registration rejects. Pass the function itself as a runtime's
 * `governance` so it is loaded on first use:
 * `createRuntime({ executor, governance: loadHostGovernance })`.
 *
 * @param options - Optional path overrides.
 * @returns The governance context, with approvals only when a provider is
 *   registered.
 * @throws `ActivePolicyError` when the policy file is malformed,
 *   `ApprovalProviderError` when the approval registration is malformed or its
 *   provider cannot be loaded, and the underlying filesystem error when either
 *   file exists but cannot be read.
 */
export async function loadHostGovernance(
  options: LoadHostGovernanceOptions = {}
): Promise<GovernanceContext> {
  const writer = createFileAuditWriter(options.auditLogPath ?? getAuditLogPath())
  const [policy, approvals] = await Promise.all([
    loadActivePolicy(options.policyPath === undefined ? {} : { path: options.policyPath }),
    loadApprovalGate({
      writer,
      ...(options.approvalConfigPath === undefined ? {} : { path: options.approvalConfigPath }),
    }),
  ])
  const keyPolicies = createStoredKeyPolicyResolver()
  return approvals === undefined
    ? { policy, keyPolicies, writer }
    : { policy, keyPolicies, ...approvals }
}
