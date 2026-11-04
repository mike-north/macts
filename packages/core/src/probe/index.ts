/**
 * Runtime probes of live apps: the identifier probe, which finds the property
 * that identifies each resource at runtime, and the nullability probe, which
 * observes (read-only, counts and kind labels only) which properties an app
 * leaves empty and what kinds of values it returns.
 *
 * @packageDocumentation
 */
export {
  probeManifest,
  type JxaRunner,
  type ProbeManifestOptions,
  type AppProbeResult,
  type ResourceProbeResult,
  type IdentifierProbeResult,
} from './probe.js'

export {
  probeNullability,
  readMacosVersion,
  resolveAccessChain,
  selectProbedProperties,
  nullabilityProbeBody,
  APP_VERSION_BODY,
  DEFAULT_NULLABILITY_BUDGET_MS,
  DEFAULT_NULLABILITY_ENVIRONMENT,
  HEAVY_PROPERTY_NAMES,
  MAX_CALL_MS,
  MAX_ITEMS_PER_COLLECTION,
  type AppNullabilityResult,
  type NullabilityProbeEnvironment,
  type ProbeNullabilityOptions,
  type PropertyPresence,
  type ResourceNullabilityResult,
  type SkipReason,
  type SkippedProperty,
} from './nullability.js'

export {
  classifyPresence,
  mergeNullabilityObservations,
  scanExhaustedNote,
  type ClaimChange,
  type IdentifierDefect,
  type KindMismatchDefect,
  type NullabilityMergeResult,
  type PropertyMergeOutcome,
  type PropertyObservation,
  type ReadFailureDefect,
  type ResourceMergeOutcome,
  type UncheckedKinds,
} from './nullability-merge.js'

export {
  writeNullabilityResults,
  writeProbeResults,
  type NotWrittenClaim,
  type NullabilityWriteResult,
} from './writer.js'
