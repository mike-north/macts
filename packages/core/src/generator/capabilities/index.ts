/**
 * Generator for the per-app machine-readable capability metadata module.
 *
 * Every generated app package carries a `src/capabilities.ts` module that
 * exports a typed, plain-data array describing each capability the app exposes,
 * including its deterministic risk classification and required permission. This
 * is the artifact that satisfies "every generated app carries machine-readable
 * risk metadata sourced from its manifest" — the data is derived from the
 * manifest by the capability registry, so it cannot drift from the generated
 * surfaces.
 *
 * The emitted module is self-contained (an inline `CapabilityMetadata`
 * interface plus a literal array), so generated packages need no extra runtime
 * dependency to expose it.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../../manifest/index.js'
import { deriveCapabilities } from '../../capabilities/registry.js'
import type { Capability } from '../../capabilities/types.js'

/**
 * Serialize a single capability to the plain-data shape embedded in generated
 * packages. Drops the derived `keywords`/`mcpToolName` ranking aids (those are
 * recomputed by the central registry) and keeps the durable, app-facing
 * metadata: identity, dependency, permission, risk, and schemas.
 */
function toMetadata(capability: Capability): Record<string, unknown> {
  return {
    name: capability.name,
    app: capability.app,
    appBundleId: capability.appBundleId,
    resource: capability.resource,
    operation: capability.operation,
    description: capability.description,
    permission: capability.permission ?? null,
    risk: capability.risk,
    inputSchema: capability.inputSchema,
  }
}

/**
 * Generate the contents of the `src/capabilities.ts` metadata module for an app.
 *
 * @param manifest - The app manifest
 * @returns TypeScript source for the capabilities metadata module
 */
export function generateCapabilitiesModule(manifest: AppManifest): string {
  const capabilities = deriveCapabilities(manifest)
  const data = capabilities.map(toMetadata)
  const dataLiteral = JSON.stringify(data, null, 2)

  return `/**
 * Machine-readable capability metadata for ${manifest.app.name}.
 *
 * Generated from the app manifest. Each entry describes one capability —
 * its stable name, app dependency, required permission (\`app:resource:operation\`),
 * and risk classification (read | write | delete | send | execute | system-change).
 *
 * @packageDocumentation
 */

/**
 * Risk classification for a capability.
 */
export type CapabilityRisk =
  | 'read'
  | 'write'
  | 'delete'
  | 'send'
  | 'execute'
  | 'system-change';

/**
 * Machine-readable description of a single capability.
 */
export interface CapabilityMetadata {
  /** Stable dotted capability name (\`<app>.<resource>.<operation>\`). */
  readonly name: string;
  /** App this capability belongs to. */
  readonly app: string;
  /** Bundle identifier of the app dependency. */
  readonly appBundleId: string;
  /** Resource the operation targets (\`app\` for app-scoped capabilities). */
  readonly resource: string;
  /** Operation name. */
  readonly operation: string;
  /** Human-readable description. */
  readonly description: string;
  /** Required permission in \`app:resource:operation\` form, or null if none. */
  readonly permission: string | null;
  /** Deterministic risk classification. */
  readonly risk: CapabilityRisk;
  /** JSON Schema for the capability's input. */
  readonly inputSchema: Record<string, unknown>;
}

/**
 * Every capability exposed by ${manifest.app.name}, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = ${dataLiteral};
`
}
