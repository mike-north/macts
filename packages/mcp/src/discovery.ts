/**
 * Built-in MCP capability-discovery tool.
 *
 * Exposes a single MCP tool — `macts__capabilities__discover` — that lets an
 * agent ask "is there a typed capability for this intent?" and get a focused,
 * context-window-friendly answer plus the snippet to call each match, without
 * loading every app's tools into context. This is the MCP counterpart of
 * `macts capabilities search` / `inspect`.
 *
 * The tool is domain-agnostic: it operates on a {@link CapabilityRegistry} and a
 * {@link GovernanceFilter}, with no macOS-specific assumptions, so a future
 * non-macOS provider's registry plugs in unchanged.
 *
 * @packageDocumentation
 */

import {
  searchCapabilities,
  applyGovernance,
  ALLOW_ALL_GOVERNANCE,
  type CapabilityRegistry,
  type GovernanceFilter,
} from '@macts/core'
import type { McpToolDefinition, JsonSchema } from './types.js'

/** Name of the built-in discovery tool. */
export const DISCOVERY_TOOL_NAME = 'macts__capabilities__discover'

/** Default number of results returned by the discovery tool. */
const DEFAULT_DISCOVERY_LIMIT = 8

/** Input schema for the discovery tool. */
const DISCOVERY_INPUT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      description: 'Free-text description of what you want to do (e.g. "create a calendar event").',
    },
    capability: {
      type: 'string',
      description:
        'Optional exact capability name to inspect (e.g. "calendar.events.create"). When set, returns the full descriptor for just that capability.',
    },
    limit: {
      type: 'number',
      description: `Maximum number of ranked results to return (default ${String(DEFAULT_DISCOVERY_LIMIT)}).`,
    },
  },
  additionalProperties: false,
}

/**
 * Options for {@link createDiscoveryTool}.
 */
export interface DiscoveryToolOptions {
  /** Capability registry to search/inspect. */
  readonly registry: CapabilityRegistry
  /**
   * Active governance filter applied to results (defaults to the no-op
   * pass-through). The governance workstream supplies a real policy here.
   */
  readonly governance?: GovernanceFilter
}

interface DiscoveryArgs {
  intent?: unknown
  capability?: unknown
  limit?: unknown
}

/**
 * Create the built-in capability-discovery MCP tool over a registry.
 *
 * Behavior:
 * - With `capability`: returns the full descriptor for that exact capability,
 *   or a not-found result.
 * - With `intent`: returns ranked, governance-filtered matches, each with the
 *   snippet to call it; when nothing matches, returns a "generate a new
 *   capability" next-move hint (never a UI/pixel fallback).
 *
 * @param options - Registry + optional governance filter
 * @returns The discovery tool definition
 */
export function createDiscoveryTool(options: DiscoveryToolOptions): McpToolDefinition {
  const { registry } = options
  const governance = options.governance ?? ALLOW_ALL_GOVERNANCE

  return {
    name: DISCOVERY_TOOL_NAME,
    description:
      'Discover typed macts capabilities for an intent (or inspect one by name). Returns ranked matches with risk, required permission, and the snippet to call each. Prefer this over loading every app tool.',
    inputSchema: DISCOVERY_INPUT_SCHEMA,
    handler: (args: unknown): Promise<unknown> => {
      const { intent, capability, limit } = (args ?? {}) as DiscoveryArgs

      // Inspect mode: exact capability name.
      if (typeof capability === 'string' && capability.length > 0) {
        const found = registry.get(capability)
        if (!found) {
          return Promise.resolve({
            found: false,
            capability,
            message: `Unknown capability "${capability}". Search by intent to discover available capabilities.`,
          })
        }
        return Promise.resolve({
          found: true,
          capability: {
            name: found.name,
            app: found.app,
            appBundleId: found.appBundleId,
            resource: found.resource,
            operation: found.operation,
            description: found.description,
            risk: found.risk,
            permission: found.permission ?? null,
            inputSchema: found.inputSchema,
            call: found.cliSnippet,
          },
        })
      }

      // Search mode: free-text intent.
      if (typeof intent !== 'string' || intent.trim().length === 0) {
        return Promise.resolve({
          error: 'Provide either an "intent" to search or a "capability" name to inspect.',
        })
      }

      const max =
        typeof limit === 'number' && Number.isFinite(limit) && limit > 0
          ? Math.floor(limit)
          : DEFAULT_DISCOVERY_LIMIT
      const ranked = searchCapabilities(registry, intent, { limit: max })
      const governed = applyGovernance(
        ranked.map((r) => r.capability),
        governance
      )

      if (governed.length === 0) {
        return Promise.resolve({
          intent,
          results: [],
          nextMove: 'generate-capability',
          message:
            'No matching capability. Generate a new one from a manifest with `macts generate <manifest> --out-dir packages` instead of driving the UI.',
        })
      }

      return Promise.resolve({
        intent,
        results: governed.map(({ capability: cap, decision }) => ({
          name: cap.name,
          app: cap.app,
          risk: cap.risk,
          permission: cap.permission ?? null,
          description: cap.description,
          call: cap.cliSnippet,
          governance: decision.disposition,
        })),
      })
    },
  }
}
