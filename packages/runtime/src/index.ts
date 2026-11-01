/**
 * `@macts/runtime` — the Mac-side runtime shared by every macts surface that
 * executes operations: the local SDK, the HTTP adapter, MCP, and the CLI's key
 * administration.
 *
 * It owns the state and checks that must behave identically no matter which
 * surface a call arrives through:
 *
 * - **Credentials** — minting, verifying, and revoking API keys, and the
 *   on-disk key store (signing secret, key metadata, per-key policies).
 * - **Governance loading** — the active host policy, the configured approval
 *   provider, per-key policy resolution, and the governance context a call is
 *   enforced against.
 * - **Shared host state** — where macts keeps its configuration and data
 *   (`MACTS_HOME`), and the process-wide structured logger.
 *
 * The runtime depends only on `@macts/core` (and through it
 * `@macts/contracts`). It never depends on a transport adapter or on the
 * public client package, so both can depend on it without depending on each
 * other. It installs no native addon.
 *
 * @packageDocumentation
 */

// API keys: minting, verification, and the key store
export * from './keys/index.js'

// Where macts keeps configuration and data
export { getMactsHome } from './paths.js'

// Process-wide structured logging
export { createLogger, getLogger, setLogger } from './logger.js'

// Governance context and per-caller resolution
export {
  resolveGovernanceForRequest,
  type ApprovalGateContext,
  type GovernanceContext,
  type GovernanceContextBase,
  type GovernanceContextWithApprovals,
  type GovernanceContextWithoutApprovals,
  type ResolvedGovernanceContext,
} from './governance/context.js'

// Active host governance policy loading
export {
  loadActivePolicy,
  getActivePolicyPath,
  ALLOW_ALL_POLICY,
  ActivePolicyError,
  type LoadActivePolicyOptions,
} from './governance/active-policy.js'

// Human-in-the-loop approval provider loading
export {
  loadApprovalConfig,
  loadApprovalGate,
  getApprovalConfigPath,
  ApprovalProviderError,
  type ApprovalProviderFactory,
  type LoadApprovalOptions,
  type LoadApprovalGateOptions,
  type LoadedApprovalGate,
} from './governance/approval-provider.js'

// Per-caller resolution of the policy attached to an API key
export {
  createKeyPolicyResolver,
  createStoredKeyPolicyResolver,
  DEFAULT_KEY_POLICY_CACHE_TTL_MS,
  type KeyPolicyResolver,
  type KeyPolicyLoader,
  type CreateKeyPolicyResolverOptions,
} from './governance/key-policy.js'
