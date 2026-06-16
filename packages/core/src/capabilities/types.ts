/**
 * Capability registry types.
 *
 * A *capability* is a single, typed, permissioned operation that an agent can
 * invoke — derived from one command in an app manifest. The registry is the
 * agent-facing index that answers "is there a typed capability for this
 * intent?" (VISION.md §7.1–7.2) without the agent holding every app's tools in
 * context.
 *
 * @packageDocumentation
 */

import type { JsonSchema } from '../generator/mcp/types.js'
import type { RiskClass } from './risk.js'

/**
 * A single discoverable capability.
 *
 * Every field is derived deterministically from the manifest, so the same
 * manifest always yields the same capability descriptor.
 */
export interface Capability {
  /**
   * Stable, dotted capability name: `<app>.<resource>.<operation>`.
   *
   * Examples (VISION.md §7.1): `calendar.events.create`,
   * `reminders.tasks.create`, `finder.files.search`. Stable across
   * regeneration so agents and recipes can reference it durably.
   */
  readonly name: string

  /** App this capability belongs to (manifest `app.name`, lowercased). */
  readonly app: string

  /** Bundle identifier of the app dependency (e.g. `com.apple.iCal`). */
  readonly appBundleId: string

  /** Resource the operation targets (e.g. `events`), or `app` for app-scoped. */
  readonly resource: string

  /**
   * Operation name — the manifest command key (camelCase).
   *
   * Examples: `create`, `list`, `doScript`. The CLI surfaces convert this to
   * kebab-case for display (e.g. `doScript` → `do-script`); the raw value
   * here preserves the manifest key so capability names are stable.
   */
  readonly operation: string

  /** Human-readable description, sourced from the manifest command. */
  readonly description: string

  /**
   * Fine-grained permission required to invoke this capability, in
   * `app:resource:operation` form (e.g. `calendar:events:create`).
   *
   * `undefined` when the manifest command declares no permission — surfaced
   * so callers can flag ungoverned capabilities rather than silently treating
   * them as unrestricted.
   */
  readonly permission: string | undefined

  /**
   * Risk classification (`read` | `write` | `delete` | `send` | `execute` |
   * `system-change`), derived deterministically from the operation semantics.
   */
  readonly risk: RiskClass

  /** JSON Schema for the capability's input parameters. */
  readonly inputSchema: JsonSchema

  /**
   * JSON Schema for the capability's output, when derivable from the manifest.
   */
  readonly outputSchema: JsonSchema | undefined

  /**
   * Lexical keywords used for discovery ranking. Derived from the capability
   * name, app, resource, operation, and description tokens.
   */
  readonly keywords: readonly string[]

  /**
   * Copy-pasteable snippet showing how to invoke this capability from the CLI.
   * Domain-agnostic: it references the public `macts` CLI surface only — never
   * any underlying automation mechanism.
   */
  readonly cliSnippet: string

  /**
   * The MCP tool name that invokes this capability
   * (`macts__<app>__<resource>_<operation>`).
   */
  readonly mcpToolName: string
}

/**
 * A capability registry: the set of capabilities derived from one or more
 * manifests, indexed by stable name.
 */
export interface CapabilityRegistry {
  /** All capabilities, in deterministic (name-sorted) order. */
  readonly capabilities: readonly Capability[]

  /**
   * Look up a single capability by its exact stable name.
   *
   * @param name - Stable dotted capability name
   * @returns The capability, or `undefined` if not registered
   */
  get(name: string): Capability | undefined

  /** Stable names of every capability in the registry, sorted. */
  readonly names: readonly string[]
}
