/**
 * Capability registry derivation from manifests.
 *
 * Walks an app manifest's commands and produces one {@link Capability} per
 * command, reusing the same resource/command resolution and JSON-Schema
 * generation as the MCP generator so discovery metadata stays coherent with
 * the generated tools (one manifest → every surface).
 *
 * The derivation is deterministic and domain-agnostic: it depends only on the
 * manifest shape, never on macOS specifics, so a future non-macOS provider can
 * feed manifests of the same shape and get a registry out.
 *
 * @packageDocumentation
 */

import type { AppManifest, Command, Resource, HierarchyChild } from '../manifest/index.js'
import type { JsonSchema } from '../generator/mcp/types.js'
import { getResources, getResourceCommands, getAppCommands } from '../generator/mcp/context.js'
import {
  generateResourceOperationSchema,
  generateAppCommandSchema,
  generateToolName,
} from '../generator/mcp/tools.js'
import { classifyCommandRisk } from './risk.js'
import type { Capability, CapabilityRegistry } from './types.js'

/**
 * Convert a camelCase / PascalCase identifier to kebab-case, matching the CLI
 * generator's flag/command-segment casing (e.g. `switchView` → `switch-view`).
 */
function toKebabCase(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * The CLI invocation path for a resource, as the CLI generator emits it: the
 * hierarchy path segments plus the parent-id flags needed to reach the resource.
 */
interface ResourceCliPath {
  /** Hierarchy path segments (e.g. `['calendars', 'events']`). */
  readonly segments: readonly string[]
  /** Parent-id flag names in kebab-case (e.g. `['calendar-id']`). */
  readonly parentFlags: readonly string[]
}

/**
 * Walk the manifest hierarchy and record, for each resource, the first CLI path
 * at which the CLI generator emits its commands. Mirrors
 * `createCliGeneratorContext`'s `buildHierarchyPaths` so discovery snippets
 * match the generated CLI exactly.
 *
 * A resource appearing at multiple hierarchy paths keeps its first (depth-first,
 * insertion-order) path, which is deterministic.
 */
function buildResourceCliPaths(manifest: AppManifest): Map<string, ResourceCliPath> {
  const paths = new Map<string, ResourceCliPath>()

  const walk = (
    children: Record<string, HierarchyChild>,
    segments: readonly string[],
    parentFlags: readonly string[]
  ): void => {
    for (const [key, child] of Object.entries(children)) {
      const nextSegments = [...segments, key]
      if (!paths.has(child.resource)) {
        paths.set(child.resource, { segments: nextSegments, parentFlags })
      }
      if (child.children) {
        const nextParentFlags = [...parentFlags, `${toKebabCase(child.resource)}-id`]
        walk(child.children, nextSegments, nextParentFlags)
      }
    }
  }

  walk(manifest.hierarchy.children, [], [])
  return paths
}

/**
 * Tokenize a string into lowercase alphanumeric keyword tokens.
 *
 * Splits on camelCase boundaries, separators, and whitespace so
 * `listEvents`, `events.list`, and `do-script` all yield useful tokens.
 *
 * @param input - Source string
 * @returns Sorted, de-duplicated lowercase tokens (length >= 2)
 */
function tokenize(input: string): string[] {
  const withBoundaries = input.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[^A-Za-z0-9]+/g, ' ')
  const tokens = withBoundaries
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 2)
  return [...new Set(tokens)].sort()
}

/**
 * Build the keyword set for a capability from its identifying fields and
 * description. Used by the discovery ranker.
 */
function deriveKeywords(parts: {
  app: string
  resource: string
  operation: string
  description: string
}): string[] {
  return tokenize([parts.app, parts.resource, parts.operation, parts.description].join(' '))
}

/**
 * Build the `--flag <value>` hints for a list of required input keys, in
 * kebab-case (matching the CLI generator's flag casing).
 */
function buildRequiredFlags(inputSchema: JsonSchema): string[] {
  const required = inputSchema.required ?? []
  return required.map((name) => `--${toKebabCase(name)} <${name}>`)
}

/**
 * Build the CLI invocation snippet for a *resource* capability.
 *
 * Matches the generated CLI exactly: `macts <app> <hierarchy…> <operation>`
 * with the parent-id flags required to reach the resource plus the command's
 * own required flags. The operation segment for non-CRUD commands is kebab-cased
 * (e.g. `do-script`), the same as the CLI generator. References only the public
 * `macts` surface — never any underlying automation mechanism.
 *
 * @param app - App name (lowercased)
 * @param cliPath - The resource's hierarchy path + parent flags
 * @param operation - Operation name (as authored in the manifest command)
 * @param inputSchema - Capability input schema (for flag hints)
 * @returns A single-line CLI snippet
 */
function buildResourceCliSnippet(
  app: string,
  cliPath: ResourceCliPath,
  operation: string,
  inputSchema: JsonSchema
): string {
  const opSegment = toKebabCase(operation)
  const segments = ['macts', app, ...cliPath.segments, opSegment]
  const parentFlags = cliPath.parentFlags.map((flag) => `--${flag} <id>`)
  // The own-required flags already include any parent ids the schema declares;
  // de-duplicate against the parent-id flags by flag name.
  const ownFlags = buildRequiredFlags(inputSchema).filter((flag) => {
    const flagName = flag.split(' ')[0]
    return !parentFlags.some((pf) => pf.split(' ')[0] === flagName)
  })
  return [...segments, ...parentFlags, ...ownFlags].join(' ')
}

/**
 * Build the CLI invocation snippet for an *application*-scoped capability:
 * `macts <app> <operation-kebab>` plus required flags. App-scoped commands have
 * no resource path segment (matching the CLI generator).
 */
function buildAppCliSnippet(app: string, operation: string, inputSchema: JsonSchema): string {
  const segments = ['macts', app, toKebabCase(operation)]
  return [...segments, ...buildRequiredFlags(inputSchema)].join(' ')
}

/**
 * Derive a single capability from a resource-scoped command.
 */
function deriveResourceCapability(
  app: string,
  bundleId: string,
  resource: Resource,
  command: Command,
  cliPath: ResourceCliPath
): Capability {
  const resourceName = resource.plural.toLowerCase()
  const inputSchema = generateResourceOperationSchema(command, resource)
  const name = `${app}.${resourceName}.${command.name}`

  return {
    name,
    app,
    appBundleId: bundleId,
    resource: resourceName,
    operation: command.name,
    description: command.description,
    permission: command.permission,
    risk: classifyCommandRisk(command),
    inputSchema,
    outputSchema: undefined,
    keywords: deriveKeywords({
      app,
      resource: resourceName,
      operation: command.name,
      description: command.description,
    }),
    cliSnippet: buildResourceCliSnippet(app, cliPath, command.name, inputSchema),
    mcpToolName: generateToolName(app, resourceName, command.name),
  }
}

/**
 * Derive a single capability from an application-scoped command.
 */
function deriveAppCapability(app: string, bundleId: string, command: Command): Capability {
  const inputSchema = generateAppCommandSchema(command)
  const name = `${app}.app.${command.name}`

  return {
    name,
    app,
    appBundleId: bundleId,
    resource: 'app',
    operation: command.name,
    description: command.description,
    permission: command.permission,
    risk: classifyCommandRisk(command),
    inputSchema,
    outputSchema: undefined,
    keywords: deriveKeywords({
      app,
      resource: 'app',
      operation: command.name,
      description: command.description,
    }),
    cliSnippet: buildAppCliSnippet(app, command.name, inputSchema),
    mcpToolName: generateToolName(app, 'app', command.name),
  }
}

/**
 * Derive the list of capabilities from a single manifest.
 *
 * Mirrors the MCP generator's traversal so the registry and generated tools
 * stay in lock-step: one capability per resource command per matching
 * resource, plus one per application command.
 *
 * @param manifest - The app manifest
 * @returns Capabilities derived from this manifest, in stable name order
 */
export function deriveCapabilities(manifest: AppManifest): Capability[] {
  const app = manifest.app.name.replace(/\s+/g, '-').toLowerCase()
  const bundleId = manifest.app.bundleId
  const cliPaths = buildResourceCliPaths(manifest)
  const capabilities: Capability[] = []

  for (const resource of getResources(manifest)) {
    const commands = getResourceCommands(manifest, resource.name)
    // Use the resource's hierarchy CLI path when present; fall back to the
    // resource plural as a single segment for resources not in the hierarchy.
    const cliPath = cliPaths.get(resource.name) ?? {
      segments: [resource.plural.toLowerCase()],
      parentFlags: [],
    }
    for (const command of commands) {
      capabilities.push(deriveResourceCapability(app, bundleId, resource, command, cliPath))
    }
  }

  for (const command of getAppCommands(manifest)) {
    capabilities.push(deriveAppCapability(app, bundleId, command))
  }

  return capabilities.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

/**
 * Build a {@link CapabilityRegistry} from one or more manifests.
 *
 * Capabilities are indexed by their stable name for O(1) lookup. If two
 * manifests produce the same capability name, the later one wins (callers are
 * expected to pass distinct apps); the registry is otherwise order-independent.
 *
 * @param manifests - App manifests to index
 * @returns A queryable capability registry
 */
export function buildCapabilityRegistry(manifests: readonly AppManifest[]): CapabilityRegistry {
  const byName = new Map<string, Capability>()

  for (const manifest of manifests) {
    for (const capability of deriveCapabilities(manifest)) {
      byName.set(capability.name, capability)
    }
  }

  const capabilities = [...byName.values()].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  )
  const names = capabilities.map((c) => c.name)

  return {
    capabilities,
    names,
    get(name: string): Capability | undefined {
      return byName.get(name)
    },
  }
}
