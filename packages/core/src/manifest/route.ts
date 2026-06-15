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
 * Normalize a resource's plural name into the canonical route segment.
 *
 * @param plural - The resource's `plural` name from the manifest.
 * @returns The canonical resource route segment (lowercased).
 */
export function normalizeResourceRouteSegment(plural: string): string {
  return plural.toLowerCase()
}

/**
 * Build the canonical route for an application-scoped command.
 *
 * Application commands are addressed as `{app}.app.{commandKey}`.
 *
 * @param appName - The raw `manifest.app.name`.
 * @param commandKey - The command's key in `manifest.commands` (NOT
 *   `command.name`). The key is globally unique within the manifest, whereas
 *   `name` is shared across resources (e.g. many commands have `name: list`).
 * @returns The canonical route string.
 */
export function buildAppCommandRoute(appName: string, commandKey: string): string {
  return `${normalizeAppRouteSegment(appName)}.app.${commandKey}`
}

/**
 * Build the canonical route for a resource-scoped command.
 *
 * Resource commands are addressed as `{app}.{resourcePlural}.{commandKey}`.
 *
 * @param appName - The raw `manifest.app.name`.
 * @param resourcePlural - The resource's `plural` name from the manifest.
 * @param commandKey - The command's key in `manifest.commands` (NOT
 *   `command.name`). The key is globally unique within the manifest, whereas
 *   `name` is shared across resources, so two distinct operations
 *   (`list` for Calendar, `listEvents` for Event) would otherwise collide.
 * @returns The canonical route string.
 */
export function buildResourceCommandRoute(
  appName: string,
  resourcePlural: string,
  commandKey: string
): string {
  return `${normalizeAppRouteSegment(appName)}.${normalizeResourceRouteSegment(
    resourcePlural
  )}.${commandKey}`
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
  /** The command key in `manifest.commands` (the route's operation segment). */
  commandKey: string
  /** The command definition. */
  command: Command
  /** The resolved resource for resource-scoped commands; undefined for app scope. */
  resource: Resource | undefined
  /** The resource type name this route targets; undefined for app scope. */
  resourceType: string | undefined
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

  if (command.scope === 'application') {
    return [
      {
        route: buildAppCommandRoute(appName, commandKey),
        commandKey,
        command,
        resource: undefined,
        resourceType: undefined,
      },
    ]
  }

  const routes: ManifestRoute[] = []
  for (const resourceType of resolveResourceTypes(command, manifest)) {
    const resource = manifest.resources[resourceType]
    const resourcePlural = resource?.plural ?? `${resourceType}s`
    routes.push({
      route: buildResourceCommandRoute(appName, resourcePlural, commandKey),
      commandKey,
      command,
      resource,
      resourceType,
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
