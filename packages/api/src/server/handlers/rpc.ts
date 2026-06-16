/**
 * Dynamic RPC handler registration for the macts API server.
 *
 * Registers RPC endpoints based on manifest commands.
 * Each command becomes a POST /rpc/{app}.{resource}.{operation} endpoint.
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import type { AppManifest, Command, Resource } from '@macts/core'
import {
  runWithApp,
  resolveCommandRoutes,
  resolveManifestRoutes,
  normalizeAppRouteSegment,
  normalizeResourceRouteSegment,
  resolveListOutputProperties,
  resolvePrimaryIdentifierProperty,
  CANONICAL_IDENTIFIER_KEY,
} from '@macts/core'
import { requirePermission } from '../middleware/permission.js'
import type { AuthVariables } from '../middleware/auth.js'
import { withSpan } from '../../telemetry.js'
import { buildSchemaRegistry } from './validation.js'

/**
 * RPC request body structure.
 */
export type RpcRequest = Record<string, unknown>

/**
 * RPC success response structure.
 */
export interface RpcSuccessResponse<T = unknown> {
  result: T
}

/**
 * RPC error response structure.
 */
export interface RpcErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Context for RPC handler execution.
 */
export interface RpcHandlerContext {
  bundleId: string
  manifest: AppManifest
}

/**
 * RPC handler function type.
 */
export type RpcHandler = (args: RpcRequest, ctx: RpcHandlerContext) => Promise<unknown>

/**
 * Registered RPC endpoint info.
 */
export interface RpcEndpointInfo {
  path: string
  permission: string
  command: Command
  resource?: Resource | undefined
}

/**
 * Create a Hono router with RPC endpoints from a manifest.
 *
 * @param manifest - The app manifest containing commands
 * @returns Hono app with RPC routes
 *
 * @example
 * ```typescript
 * import { createRpcRouter } from './handlers/rpc.js';
 * import { loadManifest } from '@macts/core';
 *
 * const manifest = await loadManifest('./calendar/app.yaml');
 * const rpc = createRpcRouter(manifest);
 *
 * // Use as sub-router
 * app.route('/api/v1', rpc);
 * ```
 */
export function createRpcRouter(manifest: AppManifest): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>()
  const appName = normalizeAppRouteSegment(manifest.app.name)
  const bundleId = manifest.app.bundleId

  const ctx: RpcHandlerContext = {
    bundleId,
    manifest,
  }

  const schemas = buildSchemaRegistry(manifest.commands)

  // Register handlers for each command
  for (const [commandName, command] of Object.entries(manifest.commands)) {
    const endpoints = getCommandEndpoints(commandName, command, manifest)

    for (const endpoint of endpoints) {
      // Register the endpoint with permission middleware
      app.post(
        endpoint.path,
        requirePermission(
          endpoint.permission,
          command.permissionHistory
            ? {
                permissionHistory: command.permissionHistory,
              }
            : {}
        ),
        async (c) => {
          try {
            // Parse JSON body
            let rawBody: unknown
            try {
              rawBody = await c.req.json()
            } catch {
              return c.json<RpcErrorResponse>(
                {
                  error: {
                    code: 'INVALID_REQUEST',
                    message: 'Request body must be valid JSON',
                  },
                },
                400
              )
            }

            // Validate against command schema
            const schema = schemas.get(commandName)
            if (schema) {
              const validation = schema.safeParse(rawBody)
              if (!validation.success) {
                return c.json<RpcErrorResponse>(
                  {
                    error: {
                      code: 'VALIDATION_ERROR',
                      message: 'Request validation failed',
                      details: validation.error.issues,
                    },
                  },
                  400
                )
              }
            }

            const body = (rawBody ?? {}) as RpcRequest
            const result = await withSpan('rpc.execute', async (span) => {
              span.setAttribute('rpc.app', appName)
              span.setAttribute('rpc.command', commandName)
              span.setAttribute('rpc.path', endpoint.path)
              return executeCommand(command, endpoint.resource, body, ctx)
            })
            return c.json<RpcSuccessResponse>({ result })
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return c.json<RpcErrorResponse>(
              {
                error: {
                  code: 'EXECUTION_ERROR',
                  message: `Command execution failed: ${message}`,
                },
              },
              500
            )
          }
        }
      )
    }
  }

  // Add introspection endpoint
  app.get('/introspect', (c) => {
    const endpoints = getAllEndpoints(manifest)
    return c.json({
      app: manifest.app.name,
      bundleId: manifest.app.bundleId,
      endpoints: endpoints.map((e) => ({
        path: e.path,
        permission: e.permission,
        method: 'POST',
        description: e.command.description,
        parameters: e.command.parameters,
        returns: e.command.returns,
      })),
    })
  })

  return app
}

/**
 * Get all endpoints for a command.
 *
 * The route string is derived from the manifest's canonical route helpers
 * (`@macts/core`) so the server router and the generated client SDK address
 * every operation identically — keyed by the command's manifest key (not
 * `command.name`). Resource-scoped commands may generate multiple endpoints if
 * they apply to multiple resource types.
 */
function getCommandEndpoints(
  commandKey: string,
  command: Command,
  manifest: AppManifest
): RpcEndpointInfo[] {
  const appSegment = normalizeAppRouteSegment(manifest.app.name)
  return resolveCommandRoutes(manifest, commandKey, command).map((r) => {
    const permissionScope =
      r.resourceType === undefined
        ? 'app'
        : normalizeResourceRouteSegment(r.resource?.plural ?? `${r.resourceType}s`)
    const permission = command.permission ?? `${appSegment}:${permissionScope}:${commandKey}`
    return {
      path: `/rpc/${r.route}`,
      permission,
      command,
      resource: r.resource,
    }
  })
}

/**
 * Get all endpoints from a manifest.
 */
function getAllEndpoints(manifest: AppManifest): RpcEndpointInfo[] {
  return resolveManifestRoutes(manifest).map((r) => {
    const appSegment = normalizeAppRouteSegment(manifest.app.name)
    const permissionScope =
      r.resourceType === undefined
        ? 'app'
        : normalizeResourceRouteSegment(r.resource?.plural ?? `${r.resourceType}s`)
    const permission = r.command.permission ?? `${appSegment}:${permissionScope}:${r.commandKey}`
    return {
      path: `/rpc/${r.route}`,
      permission,
      command: r.command,
      resource: r.resource,
    }
  })
}

/**
 * Execute a command using JXA.
 *
 * Builds and executes the appropriate JXA code based on
 * the command definition and arguments.
 */
async function executeCommand(
  command: Command,
  resource: Resource | undefined,
  args: RpcRequest,
  ctx: RpcHandlerContext
): Promise<unknown> {
  const { bundleId } = ctx

  if (command.scope === 'application') {
    return executeAppCommand(command, args, bundleId)
  }

  return executeResourceCommand(command, resource, args, ctx)
}

/**
 * Execute an application-level command.
 */
async function executeAppCommand(
  command: Command,
  args: RpcRequest,
  bundleId: string
): Promise<unknown> {
  // Build JXA code for app-level command
  const paramAssignments = command.parameters
    .map((p) => {
      const value = args[p.name]
      if (value === undefined && !p.required) {
        return null
      }
      return `var ${p.name} = ${JSON.stringify(value)};`
    })
    .filter(Boolean)
    .join('\n')

  const paramNames = command.parameters
    .filter((p) => args[p.name] !== undefined || p.required)
    .map((p) => p.name)

  const code = `
    ${paramAssignments}
    return app.${command.name}(${paramNames.length > 0 ? `{${paramNames.join(', ')}}` : ''});
  `

  return runWithApp(bundleId, code)
}

/**
 * Execute a resource-level command.
 *
 * Resource commands typically operate on collections or specific items.
 * Common patterns:
 * - list: app.calendars() -> array of items
 * - get/show: app.calendars.byId(id) -> single item
 * - create: app.Calendar({props}).make() -> new item
 * - delete: app.calendars.byId(id).delete()
 */
/**
 * Build the JXA program a `list` resource command runs.
 *
 * Every item in the returned array carries each manifest-declared property
 * PLUS the resource's primary identifier (even when the manifest declares the
 * identifier only in `identifiers`, not as a regular property) AND a canonical
 * `id` alias mirroring that identifier. This guarantees list output surfaces
 * the value sibling get/delete/write operations require, under a name the
 * consumer can always rely on — the gap a live `calendars.list` exposed, where
 * the returned objects carried no usable id (`calendarIdentifier` vs the
 * `calendarId` the create route wants).
 *
 * Exported for testing: the JXA runs only against a live app (not in CI), so we
 * assert on the generated program text at the schema level.
 *
 * @param resource - The resource the list targets (may be undefined).
 * @param paramAssignments - Pre-rendered `var x = ...;` parameter bindings.
 * @returns The JXA program source.
 */
export function buildListCommandCode(
  resource: Resource | undefined,
  paramAssignments: string
): string {
  const resourcePlural = resource?.plural.toLowerCase() ?? 'items'

  // Build the property accessor list from the manifest. We derive it through
  // resolveListOutputProperties so the resource's primary identifier is ALWAYS
  // read, even when the manifest declares it only in `identifiers` (not as a
  // regular property) — sibling get/delete/write operations need that id, and
  // listing is how an agent obtains it.
  const propNames = resolveListOutputProperties(resource)

  // The identifier is exposed under an app-specific property name
  // (e.g. `calendarIdentifier`), but write/get/delete reference it under
  // various names. Expose the same value under the canonical `id` key as well,
  // so a consumer can always read `item.id` regardless of the app's property
  // name (single source: the manifest's primary identifier).
  const idProperty = resolvePrimaryIdentifierProperty(resource)
  const idAlias =
    idProperty !== undefined
      ? `if (obj.${idProperty} !== undefined) { obj.${CANONICAL_IDENTIFIER_KEY} = obj.${idProperty}; }`
      : ''

  return `
      ${paramAssignments}
      // List ${resourcePlural}
      var items = app.${resourcePlural}();
      // Convert JXA references to plain objects by accessing each property
      var result = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var obj = {};
        ${propNames.map((p) => `try { obj.${p} = item.${p}(); } catch(e) {}`).join('\n        ')}
        ${idAlias}
        result.push(obj);
      }
      return result;
    `
}

async function executeResourceCommand(
  command: Command,
  resource: Resource | undefined,
  args: RpcRequest,
  ctx: RpcHandlerContext
): Promise<unknown> {
  const { bundleId } = ctx

  // Build JXA code for resource command
  const paramAssignments = command.parameters
    .map((p) => {
      const value = args[p.name]
      if (value === undefined && !p.required) {
        return null
      }
      return `var ${p.name} = ${JSON.stringify(value)};`
    })
    .filter(Boolean)
    .join('\n')

  // Get the plural resource name for JXA collection access
  const resourcePlural = resource?.plural.toLowerCase() ?? 'items'

  // Generate JXA code based on command operation pattern
  let code: string

  if (command.name === 'list') {
    code = buildListCommandCode(resource, paramAssignments)
  } else if (command.name === 'get') {
    // Get by ID: app.calendars.byId(id)
    const propNames = resource?.properties ? Object.keys(resource.properties) : ['name']

    code = `
      ${paramAssignments}
      // Get ${resource?.name ?? 'item'} by ID
      var item = app.${resourcePlural}.byId(id);
      var obj = {};
      ${propNames.map((p) => `try { obj.${p} = item.${p}(); } catch(e) {}`).join('\n      ')}
      return obj;
    `
  } else if (command.name === 'create') {
    // Create: app.Calendar({props}).make()
    const resourceName = resource?.name ?? 'Item'
    const props = command.parameters
      .filter((p) => p.name !== 'calendarId' && args[p.name] !== undefined)
      .map((p) => p.name)

    // Check if we're creating within a parent (e.g., event in calendar)
    if (args['calendarId']) {
      code = `
        ${paramAssignments}
        // Create ${resourceName} in calendar
        var calendar = app.calendars.byId(calendarId);
        var props = {${props.join(', ')}};
        var item = app.${resourceName}(props);
        item.make({ at: calendar.${resourcePlural} });
        return item.properties();
      `
    } else {
      code = `
        ${paramAssignments}
        // Create ${resourceName}
        var props = {${props.join(', ')}};
        var item = app.${resourceName}(props);
        item.make();
        return item.properties();
      `
    }
  } else {
    // Generic command execution
    const paramObj = command.parameters
      .filter((p) => args[p.name] !== undefined || p.required)
      .map((p) => p.name)

    code = `
      ${paramAssignments}
      // Execute resource command: ${command.name}
      var result = app.${command.name}(${paramObj.length > 0 ? `{${paramObj.join(', ')}}` : ''});
      return result;
    `
  }

  return runWithApp(bundleId, code)
}

/**
 * Create an RPC router for multiple manifests (multi-app support).
 *
 * @param manifests - Array of app manifests
 * @returns Combined Hono router
 */
export function createMultiAppRpcRouter(
  manifests: AppManifest[]
): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>()

  for (const manifest of manifests) {
    const router = createRpcRouter(manifest)
    app.route('/', router)
  }

  // Combined introspection endpoint
  app.get('/introspect/all', (c) => {
    const allApps = manifests.map((m) => ({
      app: m.app.name,
      bundleId: m.app.bundleId,
      endpoints: getAllEndpoints(m).map((e) => ({
        path: e.path,
        permission: e.permission,
        method: 'POST',
      })),
    }))
    return c.json({ apps: allApps })
  })

  return app
}
