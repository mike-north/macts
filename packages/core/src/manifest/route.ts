/**
 * Canonical RPC route derivation.
 *
 * The RPC route string (`app.resource.operation`) is the single contract
 * between the generated client SDK and the server router. Both surfaces are
 * produced from the same manifest, so they MUST derive the identical route for
 * every operation. This module is the single source of truth for that string —
 * the server router (`@macts/api`) calls these helpers at request-registration
 * time, and the SDK generator (`@macts/core`) calls them at code-generation time
 * to emit route literals. Keeping the derivation in one place prevents the two
 * surfaces from drifting (see the `events.create` vs `events.createEvent`
 * regression these helpers guard against).
 *
 * @packageDocumentation
 */

import type { AppManifest } from './schemas/index.js'
import type { Command } from './schemas/command.js'
import type { Resource } from './schemas/resource.js'
import { lowerCamel } from './lower-camel.js'

/**
 * Normalize an application name into the canonical route segment.
 *
 * Whitespace is collapsed to single hyphens and the result is lowercased, so
 * multi-word apps (e.g. "Google Chrome") produce a stable, URL-safe segment
 * (`google-chrome`) identical on both the client and the server. Both surfaces
 * MUST use this function rather than ad-hoc `toLowerCase()` calls.
 *
 * @param appName - The raw `manifest.app.name`.
 * @returns The canonical app route segment.
 */
export function normalizeAppRouteSegment(appName: string): string {
  return appName.replace(/\s+/g, '-').toLowerCase()
}

/**
 * A resource's segment: the one spelling of a resource on every public
 * surface.
 *
 * It is the acronym-aware lower camel case of the resource's plural
 * (`MediaItems` → `mediaItems`, `AIMHandles` → `aimHandles`, `Notes` →
 * `notes`). The route and operation id (`photos.mediaItems.list`), the SDK
 * resource accessor in the HTTP client and the contract (`photos.mediaItems`),
 * the MCP tool name, the capability's resource, and the scope of a derived
 * permission (`photos:mediaItems:list`) all take it from here, so a caller can
 * carry one name from any of them to the others. No surface may derive its
 * own spelling.
 *
 * @param plural - The resource's `plural` name from the manifest.
 * @returns The resource segment.
 */
export function normalizeResourceRouteSegment(plural: string): string {
  return lowerCamel(plural)
}

/**
 * A command's operation segment in its public route and default permission:
 * its `routeName` when it declares one, else its key in `manifest.commands`.
 *
 * Every surface that encodes a route or an operation name (the server router,
 * the generated clients, the contract) MUST use this segment, never the bare
 * command key, so a `routeName` override reaches all of them.
 *
 * @param commandKey - The command's key in `manifest.commands`.
 * @param command - The command definition.
 * @returns The route segment.
 */
export function commandRouteSegment(
  commandKey: string,
  command: Pick<Command, 'routeName'>
): string {
  return command.routeName ?? commandKey
}

/**
 * Build the canonical route for an application-scoped command.
 *
 * Application commands are addressed as `{app}.app.{segment}`.
 *
 * @param appName - The raw `manifest.app.name`.
 * @param segment - The command's route segment ({@link commandRouteSegment}):
 *   its `routeName`, else its key in `manifest.commands` (NOT `command.name`,
 *   which is shared across resources, e.g. many commands have `name: list`).
 * @returns The canonical route string.
 */
export function buildAppCommandRoute(appName: string, segment: string): string {
  return `${normalizeAppRouteSegment(appName)}.app.${segment}`
}

/**
 * Build the canonical route for a resource-scoped command.
 *
 * Resource commands are addressed as `{app}.{resourcePlural}.{segment}`.
 *
 * @param appName - The raw `manifest.app.name`.
 * @param resourcePlural - The resource's `plural` name from the manifest.
 * @param segment - The command's route segment ({@link commandRouteSegment}):
 *   its `routeName`, else its key in `manifest.commands` (NOT `command.name`,
 *   which is shared across resources, so two distinct operations — `list` for
 *   Calendar, `listEvents` for Event — would otherwise collide).
 * @returns The canonical route string.
 */
export function buildResourceCommandRoute(
  appName: string,
  resourcePlural: string,
  segment: string
): string {
  return `${normalizeAppRouteSegment(appName)}.${normalizeResourceRouteSegment(
    resourcePlural
  )}.${segment}`
}

/**
 * A single resolved RPC route for a manifest command.
 *
 * A resource-scoped command may resolve to multiple routes if it applies to
 * multiple resource types; each entry carries the resolved resource.
 */
export interface ManifestRoute {
  /** The canonical route string (`app.resource.operation`). */
  route: string
  /**
   * The command key in `manifest.commands`, by which executors find the
   * command. The route's operation segment is the command's `routeName` when
   * it declares one, else this key.
   */
  commandKey: string
  /** The command definition. */
  command: Command
  /** The resolved resource for resource-scoped commands; undefined for app scope. */
  resource: Resource | undefined
  /** The resource type name this route targets; undefined for app scope. */
  resourceType: string | undefined
  /**
   * The permission the operation requires (`app:scope:segment`).
   *
   * The command's explicit `permission` wins. Otherwise it is derived from the
   * app route segment, the scope (`app` for application commands, else the
   * resource route segment), and the command's route segment
   * ({@link commandRouteSegment}), which is the rule the server enforces. Deriving it here, once, lets every surface that declares or
   * checks an operation's permission (generated contracts, the runtime's
   * registration check, the server) agree by construction.
   */
  permission: string
}

/**
 * The permission a command requires on one route: its explicit `permission`,
 * or `{app}:{scope}:{segment}`.
 */
function routePermission(
  appName: string,
  scopeSegment: string,
  segment: string,
  command: Command
): string {
  return command.permission ?? `${normalizeAppRouteSegment(appName)}:${scopeSegment}:${segment}`
}

/**
 * Resolve the resource type names a resource-scoped command applies to.
 *
 * An omitted `resourceType` means the command applies to every resource.
 */
function resolveResourceTypes(command: Command, manifest: AppManifest): string[] {
  if (command.resourceType === undefined) {
    return Object.keys(manifest.resources)
  }
  if (Array.isArray(command.resourceType)) {
    return command.resourceType
  }
  return [command.resourceType]
}

/**
 * Resolve every canonical RPC route for a single manifest command.
 *
 * @param manifest - The app manifest.
 * @param commandKey - The command's key in `manifest.commands`.
 * @param command - The command definition.
 * @returns One route for application commands; one route per targeted resource
 *   type for resource commands.
 */
export function resolveCommandRoutes(
  manifest: AppManifest,
  commandKey: string,
  command: Command
): ManifestRoute[] {
  const appName = manifest.app.name
  const segment = commandRouteSegment(commandKey, command)

  if (command.scope === 'application') {
    return [
      {
        route: buildAppCommandRoute(appName, segment),
        commandKey,
        command,
        resource: undefined,
        resourceType: undefined,
        permission: routePermission(appName, 'app', segment, command),
      },
    ]
  }

  const routes: ManifestRoute[] = []
  for (const resourceType of resolveResourceTypes(command, manifest)) {
    const resource = manifest.resources[resourceType]
    const resourcePlural = resource?.plural ?? `${resourceType}s`
    routes.push({
      route: buildResourceCommandRoute(appName, resourcePlural, segment),
      commandKey,
      command,
      resource,
      resourceType,
      permission: routePermission(
        appName,
        normalizeResourceRouteSegment(resourcePlural),
        segment,
        command
      ),
    })
  }
  return routes
}

/**
 * Resolve every canonical RPC route for an entire manifest, across all commands.
 *
 * @param manifest - The app manifest.
 * @returns Every route the manifest exposes, in command-declaration order.
 */
export function resolveManifestRoutes(manifest: AppManifest): ManifestRoute[] {
  const routes: ManifestRoute[] = []
  for (const [commandKey, command] of Object.entries(manifest.commands)) {
    routes.push(...resolveCommandRoutes(manifest, commandKey, command))
  }
  return routes
}

/**
 * The route strings two or more of a manifest's commands resolve to, each with
 * the command keys that share it. A route identifies one operation, so any
 * entry here is a manifest error.
 *
 * @param manifest - The app manifest.
 * @returns One entry per duplicated route, in first-declaration order.
 */
export function findDuplicateRoutes(
  manifest: AppManifest
): { route: string; commandKeys: string[] }[] {
  const byRoute = new Map<string, string[]>()
  for (const route of resolveManifestRoutes(manifest)) {
    const keys = byRoute.get(route.route) ?? []
    keys.push(route.commandKey)
    byRoute.set(route.route, keys)
  }
  return [...byRoute]
    .filter(([, keys]) => keys.length > 1)
    .map(([route, commandKeys]) => ({ route, commandKeys }))
}
