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
import { runWithApp } from '@macts/core'
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
  const appName = manifest.app.name.toLowerCase()
  const bundleId = manifest.app.bundleId

  const ctx: RpcHandlerContext = {
    bundleId,
    manifest,
  }

  const schemas = buildSchemaRegistry(manifest.commands)

  // Register handlers for each command
  for (const [commandName, command] of Object.entries(manifest.commands)) {
    const endpoints = getCommandEndpoints(appName, commandName, command, manifest)

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
 * Resource-scoped commands may generate multiple endpoints
 * if they apply to multiple resource types.
 */
function getCommandEndpoints(
  appName: string,
  commandName: string,
  command: Command,
  manifest: AppManifest
): RpcEndpointInfo[] {
  if (command.scope === 'application') {
    // App-level commands: /rpc/{app}.app.{command}
    const path = `/rpc/${appName}.app.${commandName}`
    const permission = command.permission ?? `${appName}:app:${commandName}`
    return [{ path, permission, command }]
  }

  // Resource-scoped commands
  const resourceTypes = getResourceTypes(command, manifest)
  const endpoints: RpcEndpointInfo[] = []
  for (const resourceType of resourceTypes) {
    const resource = manifest.resources[resourceType]
    // Use plural resource name for paths (lowercase for consistency)
    const resourcePath = (resource?.plural ?? `${resourceType}s`).toLowerCase()
    const path = `/rpc/${appName}.${resourcePath}.${commandName}`
    const permission = command.permission ?? `${appName}:${resourcePath}:${commandName}`
    endpoints.push({ path, permission, command, resource })
  }
  return endpoints
}

/**
 * Get the resource types a command applies to.
 */
function getResourceTypes(command: Command, manifest: AppManifest): string[] {
  if (!command.resourceType) {
    // Applies to all resources
    return Object.keys(manifest.resources)
  }
  if (Array.isArray(command.resourceType)) {
    return command.resourceType
  }
  return [command.resourceType]
}

/**
 * Get all endpoints from a manifest.
 */
function getAllEndpoints(manifest: AppManifest): RpcEndpointInfo[] {
  const appName = manifest.app.name.toLowerCase()
  const endpoints: RpcEndpointInfo[] = []

  for (const [commandName, command] of Object.entries(manifest.commands)) {
    endpoints.push(...getCommandEndpoints(appName, commandName, command, manifest))
  }

  return endpoints
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
    // List command: app.calendars() or app.calendars[0].events()
    // Build property accessor list from manifest
    const propNames = resource?.properties ? Object.keys(resource.properties) : ['name']

    code = `
      ${paramAssignments}
      // List ${resourcePlural}
      var items = app.${resourcePlural}();
      // Convert JXA references to plain objects by accessing each property
      var result = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var obj = {};
        ${propNames.map((p) => `try { obj.${p} = item.${p}(); } catch(e) {}`).join('\n        ')}
        result.push(obj);
      }
      return result;
    `
  } else if (command.name === 'get') {
    // Get by ID: app.calendars.byId(calendarIdentifier)
    const idParam = command.parameters.find((p) => p.required)?.name ?? 'id'
    const propNames = resource?.properties ? Object.keys(resource.properties) : ['name']

    code = `
      ${paramAssignments}
      // Get ${resource?.name ?? 'item'} by ID
      var item = app.${resourcePlural}.byId(${idParam});
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
  } else if (command.name === 'delete') {
    // Delete: app.calendars.byId(id).delete()
    const idParam = command.parameters.find((p) => p.required)?.name ?? 'id'

    code = `
      ${paramAssignments}
      // Delete ${resource?.name ?? 'item'} by ID
      app.${resourcePlural}.byId(${idParam}).delete();
      return undefined;
    `
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
