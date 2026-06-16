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
 * When the command has a required parent identifier (e.g. `calendarId` in
 * `listEvents`), the JXA is scoped to the parent resource so only the children
 * belonging to that parent are returned. The parent's plural resource name and
 * the identifier parameter name are resolved from the manifest command
 * parameters — never hardcoded.
 *
 * Exported for testing: the JXA runs only against a live app (not in CI), so we
 * assert on the generated program text at the schema level.
 *
 * @param resource - The resource the list targets (may be undefined).
 * @param paramAssignments - Pre-rendered `var x = ...;` parameter bindings.
 * @param command - The list command definition (used to resolve required parent params).
 * @param manifest - The full app manifest (used to resolve the parent resource plural).
 * @returns The JXA program source.
 */
export function buildListCommandCode(
  resource: Resource | undefined,
  paramAssignments: string,
  command?: { parameters: { name: string; required: boolean }[] },
  manifest?: { resources: Record<string, Resource> }
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

  // Resolve the required parent identifier parameter (if any) so the JXA can
  // scope the list to the parent resource. We use the manifest's parameter list
  // for the command — the first required parameter that is NOT the resource's
  // own primary identifier is the parent scoping param (e.g. `calendarId` for
  // `listEvents`).
  const ownIdProperty = resolvePrimaryIdentifierProperty(resource)
  const parentParam = command?.parameters.find((p) => p.required && p.name !== ownIdProperty)

  // When we have a required parent param, resolve the parent resource so we can
  // derive its plural. We look through the manifest resources and find the one
  // whose primary identifier property name (lowercased + 'Id') matches the
  // param name (e.g. `calendarId` → look for resource with primary id
  // `calendarIdentifier` in the Calendar resource). As a fallback we strip the
  // trailing 'Id' suffix and treat the remainder as the parent plural.
  let collectionExpr = `app.${resourcePlural}()`
  if (parentParam !== undefined) {
    const parentIdParam = parentParam.name // e.g. "calendarId"

    // Try to find the parent resource by matching the param name against each
    // resource's primary identifier property or its plural.
    let parentPlural: string | undefined
    if (manifest !== undefined) {
      for (const res of Object.values(manifest.resources)) {
        const primaryId = resolvePrimaryIdentifierProperty(res)
        // Match heuristic: "calendarId" → Calendar has primaryId "calendarIdentifier"
        // whose prefix ("calendar") matches the param name prefix.
        const paramBase = parentIdParam.endsWith('Id')
          ? parentIdParam.slice(0, -2).toLowerCase()
          : parentIdParam.toLowerCase()
        const resNameLower = res.name.toLowerCase()
        const resPluralLower = res.plural.toLowerCase()
        if (
          primaryId?.toLowerCase().startsWith(paramBase) === true ||
          resNameLower === paramBase ||
          resPluralLower === paramBase + 's' ||
          resPluralLower === paramBase
        ) {
          parentPlural = res.plural.toLowerCase()
          break
        }
      }
    }

    // Fallback: derive the plural from the param name by stripping the "Id" suffix.
    if (parentPlural === undefined) {
      const paramBase = parentIdParam.endsWith('Id')
        ? parentIdParam.slice(0, -2).toLowerCase()
        : parentIdParam.toLowerCase()
      parentPlural = `${paramBase}s`
    }

    collectionExpr = `app.${parentPlural}.byId(${parentIdParam}).${resourcePlural}()`
  }

  return `
      ${paramAssignments}
      // List ${resourcePlural}
      var items = ${collectionExpr};
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
  const { bundleId, manifest } = ctx

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
    // Pass the command and manifest so buildListCommandCode can scope the list
    // to the parent resource when the command has a required parent identifier.
    code = buildListCommandCode(resource, paramAssignments, command, manifest)
  } else if (command.name === 'get') {
    // Get by identifier: app.resource.byId(<identifierParam>)
    // Resolve the identifier variable name from the manifest via the shared
    // resolver — never hardcode 'id'. The primary identifier is the single
    // source of truth (manifest/identifier.ts); the command's required
    // parameter must match it.
    const identifierParam =
      resolvePrimaryIdentifierProperty(resource) ??
      command.parameters.find((p) => p.required)?.name ??
      'id'

    // Validate: if the identifier param is required but not provided, return a
    // structured error rather than emit `byId(undefined)` into JXA.
    if (args[identifierParam] === undefined) {
      return Promise.reject(
        Object.assign(new Error(`Missing required parameter: ${identifierParam}`), {
          code: 'VALIDATION_ERROR',
        })
      )
    }

    const propNames = resource?.properties ? Object.keys(resource.properties) : ['name']

    code = `
      ${paramAssignments}
      // Get ${resource?.name ?? 'item'} by identifier
      var item = app.${resourcePlural}.byId(${identifierParam});
      var obj = {};
      ${propNames.map((p) => `try { obj.${p} = item.${p}(); } catch(e) {}`).join('\n      ')}
      return obj;
    `
  } else if (command.name === 'delete') {
    // Delete by identifier: app.resource.byId(<identifierParam>).delete()
    // Resolve the identifier from the manifest via the shared resolver so this
    // branch stays consistent with get — never hardcode 'id'.
    //
    // If the resource declares no identifier (e.g. System Events DiskItem
    // delete which has parameters: []), fall through to the generic handler
    // rather than silently using an undefined variable in byId().
    const identifierParam =
      resolvePrimaryIdentifierProperty(resource) ?? command.parameters.find((p) => p.required)?.name

    if (identifierParam !== undefined) {
      // Guard: emit a structured error if the required identifier is absent.
      if (args[identifierParam] === undefined) {
        return Promise.reject(
          Object.assign(new Error(`Missing required parameter: ${identifierParam}`), {
            code: 'VALIDATION_ERROR',
          })
        )
      }

      code = `
      ${paramAssignments}
      // Delete ${resource?.name ?? 'item'} by identifier
      var item = app.${resourcePlural}.byId(${identifierParam});
      item.delete();
      return null;
    `
    } else {
      // No required identifier: fall through to generic resource command execution
      // (e.g. app.delete() for parameter-free delete operations)
      const paramObj = command.parameters
        .filter((p) => args[p.name] !== undefined || p.required)
        .map((p) => p.name)

      code = `
      ${paramAssignments}
      // Execute resource delete command (no identifier required)
      var result = app.${command.name}(${paramObj.length > 0 ? `{${paramObj.join(', ')}}` : ''});
      return result;
    `
    }
  } else if (command.name === 'create') {
    // Create: app.ResourceName({props}).make()
    //
    // This branch is fully manifest-driven. When the command has a required
    // parent identifier parameter (e.g. `calendarId` for createEvent,
    // `listId` for createReminder), we resolve the parent resource's plural
    // via `resolvePrimaryIdentifierProperty` + manifest lookup — never
    // hardcode 'calendarId' or 'calendars'.
    const resourceName = resource?.name ?? 'Item'

    // Detect a required parent identifier: a required parameter whose name
    // does NOT correspond to the resource's own primary identifier.
    const ownIdProperty = resolvePrimaryIdentifierProperty(resource)
    const parentParam = command.parameters.find(
      (p) =>
        p.required && p.name !== ownIdProperty && !Object.hasOwn(resource?.properties ?? {}, p.name)
    )

    if (parentParam !== undefined) {
      const parentIdParam = parentParam.name // e.g. "calendarId", "listId"

      // Guard: emit a structured error if the parent identifier is absent.
      if (args[parentIdParam] === undefined) {
        return Promise.reject(
          Object.assign(new Error(`Missing required parameter: ${parentIdParam}`), {
            code: 'VALIDATION_ERROR',
          })
        )
      }

      // Resolve the parent resource's plural by matching the param name against
      // each resource's primary identifier or name — manifest-driven, not hardcoded.
      let parentPlural: string | undefined
      for (const res of Object.values(manifest.resources)) {
        const primaryId = resolvePrimaryIdentifierProperty(res)
        const paramBase = parentIdParam.endsWith('Id')
          ? parentIdParam.slice(0, -2).toLowerCase()
          : parentIdParam.toLowerCase()
        const resNameLower = res.name.toLowerCase()
        const resPluralLower = res.plural.toLowerCase()
        if (
          primaryId?.toLowerCase().startsWith(paramBase) === true ||
          resNameLower === paramBase ||
          resPluralLower === paramBase + 's' ||
          resPluralLower === paramBase
        ) {
          parentPlural = res.plural.toLowerCase()
          break
        }
      }
      if (parentPlural === undefined) {
        const paramBase = parentIdParam.endsWith('Id')
          ? parentIdParam.slice(0, -2).toLowerCase()
          : parentIdParam.toLowerCase()
        parentPlural = `${paramBase}s`
      }

      // Props are all parameters except the parent identifier.
      const props = command.parameters
        .filter((p) => p.name !== parentIdParam && args[p.name] !== undefined)
        .map((p) => p.name)

      code = `
        ${paramAssignments}
        // Create ${resourceName} within parent (${parentIdParam})
        var parent = app.${parentPlural}.byId(${parentIdParam});
        var props = {${props.join(', ')}};
        var item = app.${resourceName}(props);
        item.make({ at: parent.${resourcePlural} });
        return item.properties();
      `
    } else {
      // No parent identifier: create at the top level.
      const props = command.parameters.filter((p) => args[p.name] !== undefined).map((p) => p.name)

      code = `
        ${paramAssignments}
        // Create ${resourceName}
        var props = {${props.join(', ')}};
        var item = app.${resourceName}(props);
        item.make();
        return item.properties();
      `
    }
  } else if (command.name === 'update') {
    // Update by identifier: set each provided field on the resource item.
    // Resolve the target identifier from the manifest via the shared resolver
    // (consistent with get/delete above) — never hardcode 'id'.
    const identifierParam =
      resolvePrimaryIdentifierProperty(resource) ??
      command.parameters.find((p) => p.required)?.name ??
      'id'

    // Guard: emit a structured error if the required identifier is absent.
    if (args[identifierParam] === undefined) {
      return Promise.reject(
        Object.assign(new Error(`Missing required parameter: ${identifierParam}`), {
          code: 'VALIDATION_ERROR',
        })
      )
    }

    // Collect the writable fields from the provided args (excluding the identifier).
    const writableFields = command.parameters
      .filter((p) => p.name !== identifierParam && args[p.name] !== undefined)
      .map((p) => p.name)

    // Generate a property-assignment statement for each updated field.
    const fieldAssignments = writableFields
      .map((fieldName) => `try { item.${fieldName} = ${fieldName}; } catch(e) {}`)
      .join('\n      ')

    code = `
      ${paramAssignments}
      // Update ${resource?.name ?? 'item'} by identifier
      var item = app.${resourcePlural}.byId(${identifierParam});
      ${fieldAssignments}
      return item.properties();
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
