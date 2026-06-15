/**
 * Capability discovery for macts.
 *
 * Derives a manifest-sourced *capability registry* — each capability with a
 * stable name, app dependency, input/output schema, required permission
 * (`app:resource:operation`), and a deterministic risk classification — and
 * provides lexical search plus a governance filter seam over it. Consumable by
 * both the CLI and the MCP discovery surfaces.
 *
 * @packageDocumentation
 */

// Risk classification
export {
  RISK_CLASSES,
  type RiskClass,
  DEFAULT_RISK,
  compareRisk,
  isRiskClass,
  classifyRiskFromOperation,
  classifyCommandRisk,
} from './risk.js'

// Capability + registry types
export type { Capability, CapabilityRegistry } from './types.js'

// Registry derivation
export { deriveCapabilities, buildCapabilityRegistry } from './registry.js'

// Discovery search
export {
  SEARCH_WEIGHTS,
  type CapabilitySearchResult,
  type SearchCapabilitiesOptions,
  tokenizeIntent,
  scoreCapability,
  searchCapabilities,
} from './search.js'

// Governance filter seam
export {
  type GovernanceDisposition,
  type GovernanceDecision,
  type GovernedCapability,
  type GovernanceFilter,
  ALLOW_ALL_GOVERNANCE,
  applyGovernance,
} from './governance.js'

// Registry loading from a manifests directory
export { loadManifestsFromDir, loadCapabilityRegistry } from './loader.js'
