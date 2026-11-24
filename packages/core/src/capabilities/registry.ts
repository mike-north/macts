/**
 * Capability registry derivation from manifests.
 *
 * Walks an app manifest's commands and produces one {@link Capability} per
 * command, with its input schema and MCP tool name from `./operation-schema.ts`
 * (one manifest → every surface).
 *
 * The derivation is deterministic and domain-agnostic: it depends only on the
 * manifest shape, never on macOS specifics, so a future non-macOS provider can
 * feed manifests of the same shape and get a registry out.
 *
 * @packageDocumentation
 */
import { normalizeManifestAddresses } from '../manifest/normalize-addresses.js'

import type { AppManifest, Command, Resource } from '../manifest/index.js'
import {
  commandRouteSegment,
  normalizeResourceRouteSegment,
  resolveManifestRoutes,
} from '../manifest/route.js'
import type { ManifestRoute } from '../manifest/route.js'
import {
  generateAppCommandSchema,
  generateResourceOperationSchema,
  generateToolName,
  getAppCommands,
  getResourceCommands,
  getResources,
  type JsonSchema,
} from './operation-schema.js'
import { isOperationAvailable, omittedInputs } from '../generator/input-satisfiability.js'
import { classifyCommandRisk } from './risk.js'
import { commandMethodParameters } from '../generator/surface.js'
import { cliCommandTree, type CliTreeCommand } from '../generator/cli/command-tree.js'
import { itemIdentifierParameter, selectsOneItem } from '../manifest/item-selection.js'
import type { Capability, CapabilityRegistry } from './types.js'

/**
 * Convert a camelCase / PascalCase identifier to kebab-case, matching the CLI
 * generator's flag/command-segment casing (e.g. `switchView` → `switch-view`).
 */
function toKebabCase(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * The CLI command of a resource capability, as the CLI generator emits it: the
 * hierarchy path segments it sits under, its own name, and the parent-id flags
 * needed to reach the resource.
 */
interface ResourceCliPath {
  /** Hierarchy path segments (e.g. `['calendars', 'events']`). */
  readonly segments: readonly string[]
  /** The command's own CLI name, kebab-cased (e.g. `list`, `do-script`). */
  readonly operation: string
  /** Parent-id flag names in kebab-case (e.g. `['calendar-id']`). */
  readonly parentFlags: readonly string[]
}

/**
 * The CLI command a resource capability names, from the CLI's command tree
 * (`../generator/cli/command-tree.ts`): the first command the tree generates
 * for that manifest command on that resource. `undefined` when the CLI has no
 * command for the operation, so the capability has no CLI snippet.
 */
function resourceCliPath(
  tree: readonly CliTreeCommand[],
  command: Command,
  resourceName: string
): ResourceCliPath | undefined {
  const entry = tree.find(
    (candidate) => candidate.command === command && candidate.resourceName === resourceName
  )
  if (entry?.at === undefined) return undefined
  return {
    segments: entry.at.path,
    operation: entry.name,
    parentFlags: entry.at.parentParams.map(
      ({ resourceName: parent }) => `${toKebabCase(parent)}-id`
    ),
  }
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
 * @param cliPath - The command's CLI path, name and parent flags
 * @param inputSchema - Capability input schema (for flag hints)
 * @returns A single-line CLI snippet
 */
function buildResourceCliSnippet(
  app: string,
  cliPath: ResourceCliPath,
  inputSchema: JsonSchema,
  command: Command,
  version: AppManifest['version']
): string {
  // Explicit selections use declared inputs, never parent flags invented from placement.
  if (version === '1.1') {
    // Collection inputs are flags even when required; only item selection creates a positional.
    const item = selectsOneItem(command) ? itemIdentifierParameter(command)?.name : undefined
    const inputs = commandMethodParameters(command)
      .signature.filter(({ parameter }) => parameter.required)
      .map(({ parameter: { name } }) =>
        name === item ? `<${name}>` : `--${toKebabCase(name)} <${name}>`
      )
    return ['macts', app, ...cliPath.segments, cliPath.operation, ...inputs].join(' ')
  }
  const segments = ['macts', app, ...cliPath.segments, cliPath.operation]
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
 * Looks up the resolved operation one command exposes on one resource. The resource
 * is `undefined` for an application-scoped command.
 */
type RouteLookup = (command: Command, resource: Resource | undefined) => ManifestRoute

/**
 * Index resolved operation identities and permissions by
 * command and targeted resource.
 *
 * A capability reports the permission the server router and the runtime
 * operation registry enforce for the same operation, so it takes it from the
 * resolved route ({@link ManifestRoute.permission}): the command's explicit
 * `permission`, else the one derived from its route. Reading the command's
 * declared `permission` alone would report no permission for every command
 * whose permission is derived.
 *
 * Routes are matched to capabilities by the command and resource objects
 * themselves, which `resolveManifestRoutes` and the capability traversal share.
 * The lookup throws if a capability has no route: that would mean discovery and
 * the router disagree on which operations the manifest exposes.
 *
 * @param manifest - The app manifest
 * @returns The resolved route lookup
 */
function indexRoutes(manifest: AppManifest): RouteLookup {
  const byCommand = new Map<Command, ManifestRoute[]>()
  for (const route of resolveManifestRoutes(manifest)) {
    const routes = byCommand.get(route.command) ?? []
    routes.push(route)
    byCommand.set(route.command, routes)
  }
  return (command, resource) => {
    const route = byCommand.get(command)?.find((candidate) => candidate.resource === resource)
    if (route === undefined) {
      throw new Error(
        `Manifest "${manifest.app.name}": command "${command.name}" on ${
          resource === undefined ? 'the application' : `resource "${resource.name}"`
        } has no resolved route, so its capability has no permission`
      )
    }
    return route
  }
}

/**
 * An input schema without the named fields: the inputs an operation leaves
 * out because they admit no value (see `../generator/input-satisfiability.ts`),
 * so a capability never advertises a field no request can fill.
 */
function withoutInputs(schema: JsonSchema, omitted: ReadonlySet<string>): JsonSchema {
  if (omitted.size === 0) return schema
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).filter(([name]) => !omitted.has(name))
  )
  const required = (schema.required ?? []).filter((name) => !omitted.has(name))
  const { required: _required, ...rest } = schema
  return { ...rest, properties, ...(required.length > 0 ? { required } : {}) }
}

/**
 * Derive a single capability from a resource-scoped command. Its CLI snippet
 * names the CLI command `cliPath`; it has none when the CLI has no command for
 * the operation.
 */
function deriveResourceCapability(
  app: string,
  bundleId: string,
  resource: Resource,
  command: Command,
  cliPath: ResourceCliPath | undefined,
  route: ManifestRoute,
  omitted: ReadonlySet<string>,
  version: AppManifest['version']
): Capability {
  const resourceName = normalizeResourceRouteSegment(resource.plural)
  const inputSchema = withoutInputs(generateResourceOperationSchema(command, resource), omitted)
  const operation = commandRouteSegment(route.commandKey, command)
  const name = route.route

  return {
    name,
    app,
    appBundleId: bundleId,
    resource: resourceName,
    operation,
    description: command.description,
    permission: route.permission,
    risk: classifyCommandRisk(command),
    inputSchema,
    outputSchema: undefined,
    keywords: deriveKeywords({
      app,
      resource: resourceName,
      operation,
      description: command.description,
    }),
    cliSnippet:
      cliPath === undefined
        ? undefined
        : buildResourceCliSnippet(app, cliPath, inputSchema, command, version),
    mcpToolName: generateToolName(app, resourceName, operation),
  }
}

/**
 * Derive a single capability from an application-scoped command.
 */
function deriveAppCapability(
  app: string,
  bundleId: string,
  command: Command,
  route: ManifestRoute,
  omitted: ReadonlySet<string>,
  hasCliCommand: boolean
): Capability {
  const inputSchema = withoutInputs(generateAppCommandSchema(command), omitted)
  const operation = commandRouteSegment(route.commandKey, command)
  const name = route.route

  return {
    name,
    app,
    appBundleId: bundleId,
    resource: 'app',
    operation,
    description: command.description,
    permission: route.permission,
    risk: classifyCommandRisk(command),
    inputSchema,
    outputSchema: undefined,
    keywords: deriveKeywords({
      app,
      resource: 'app',
      operation,
      description: command.description,
    }),
    cliSnippet: hasCliCommand ? buildAppCliSnippet(app, command.name, inputSchema) : undefined,
    mcpToolName: generateToolName(app, 'app', operation),
  }
}

/**
 * Derive the list of capabilities from a single manifest.
 *
 * One capability per operation the manifest exposes: one per resource command
 * per matching resource, plus one per application command. These are the same
 * operations the app's generated contract describes, so every capability has
 * exactly one contract operation and shares its MCP tool name. An operation
 * that cannot be called, because a required input admits no value, has no
 * capability, as it has no MCP tool and no CLI command.
 *
 * @param manifest - The app manifest
 * @returns Capabilities derived from this manifest, in stable name order
 */
export function deriveCapabilities(manifest: AppManifest): Capability[] {
  manifest = normalizeManifestAddresses(manifest)
  const app = manifest.app.name.replace(/\s+/g, '-').toLowerCase()
  const bundleId = manifest.app.bundleId
  const tree = cliCommandTree(manifest)
  const routeOf = indexRoutes(manifest)
  const capabilities: Capability[] = []

  for (const resource of getResources(manifest)) {
    const commands = getResourceCommands(manifest, resource.name)
    for (const command of commands) {
      if (!isOperationAvailable(manifest, command, resource.name)) continue
      capabilities.push(
        deriveResourceCapability(
          app,
          bundleId,
          resource,
          command,
          resourceCliPath(tree, command, resource.name),
          routeOf(command, resource),
          omittedInputs(manifest, command, resource.name),
          manifest.version
        )
      )
    }
  }

  for (const command of getAppCommands(manifest)) {
    if (!isOperationAvailable(manifest, command, undefined)) continue
    capabilities.push(
      deriveAppCapability(
        app,
        bundleId,
        command,
        routeOf(command, undefined),
        omittedInputs(manifest, command, undefined),
        tree.some((entry) => entry.kind === 'app' && entry.command === command)
      )
    )
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
