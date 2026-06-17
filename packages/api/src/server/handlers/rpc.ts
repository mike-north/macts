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
  resolveIdentifierTargeting,
  classifyCommandRisk,
  CANONICAL_IDENTIFIER_KEY,
} from '@macts/core'
import { requirePermission } from '../middleware/permission.js'
import { requirePolicy, type GovernanceContext } from '../middleware/governance.js'
import { ALLOW_ALL_POLICY } from '../governance/active-policy.js'
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
 * @param governance - Optional governance context (active policy + audit
 *   writer). When omitted, defaults to the allow-all policy so call-time policy
 *   enforcement is a no-op and pre-governance behavior is preserved.
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
export function createRpcRouter(
  manifest: AppManifest,
  governance: GovernanceContext = { policy: ALLOW_ALL_POLICY }
): Hono<{ Variables: AuthVariables }> {
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
    // Risk class drives read-only governance semantics; derived once per command.
    const risk = classifyCommandRisk(command)

    for (const endpoint of endpoints) {
      // Register the endpoint with permission middleware (API-key check) followed
      // by governance-policy enforcement (additive call-time policy check).
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
        requirePolicy({ permission: endpoint.permission, risk, governance }),
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
      // Date-typed params arrive as ISO strings over JSON; rehydrate them as
      // JXA Date objects (a raw string makes Calendar's make/push throw).
      if (p.type === 'date') {
        return `var ${p.name} = new Date(${JSON.stringify(value)});`
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
 * Resolve the parent identifier parameter and derive the parent target expression
 * for a resource command that operates on a nested child resource.
 *
 * A "parent param" is a required command parameter whose name is NOT one of the
 * child resource's own properties (e.g. `calendarId` on `getEvent` / `deleteEvent`
 * / `updateEvent` — it is not an Event property, so it must refer to the parent
 * Calendar). This mirrors the same detection used in the `create` and `list`
 * branches.
 *
 * When found, returns the JXA expression for the parent specifier (e.g.
 * `app.calendars.whose({ name: calendarId })[0]`) and the parent param name.
 * Returns `undefined` when the command has no parent scope (flat top-level
 * resource — keep using `app.<plural>.byId(id)`).
 *
 * @param command - The command definition.
 * @param _resource - The child resource (reserved; not currently used).
 * @param manifest - Full manifest, used to resolve parent resource + targeting.
 */
function resolveParentScope(
  command: Command,
  _resource: Resource | undefined,
  manifest: AppManifest
): { parentTarget: string; parentIdParam: string } | undefined {
  // A parent scope exists ONLY when the command has ≥2 required params.
  // The first required param is the parent identifier; the last is the child id.
  // Single-required-param commands (flat top-level resources) never have a parent.
  const requiredParams = command.parameters.filter((p) => p.required)
  if (requiredParams.length < 2) return undefined

  const parentParam = requiredParams[0]
  if (parentParam === undefined) return undefined

  const parentIdParam = parentParam.name // e.g. "calendarId"

  // Resolve the parent resource by matching the param name against each resource's
  // primary identifier property or name/plural — the same heuristic the list/create
  // branches use so parent targeting is consistent across all operations.
  let parentResource: Resource | undefined
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
      parentResource = res
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

  // Honor the parent's identifier targeting strategy (byId vs byProperty) so a
  // parent whose declared id is not runtime-valid (e.g. Calendar matched by name)
  // is reached correctly.
  const parentTarget = buildTargetExpression(parentResource, parentPlural, parentIdParam)
  return { parentTarget, parentIdParam }
}

/**
 * Build the JXA expression that targets a child resource item nested under a
 * parent specifier. Used by the parent-scoped get/update/delete branches where
 * the child resource is not a top-level collection (e.g. Calendar events).
 *
 * The emitted expression is `<parentTarget>.<childPlural>.byId(<childIdVar>)`.
 * Events in Calendar.app are only addressable this way — `app.events.byId(uid)`
 * builds a lazy specifier that throws -1728 "Can't get object" at runtime because
 * events are not a top-level JXA collection.
 *
 * @param parentTarget - The JXA expression for the parent specifier.
 * @param childPlural - The lowercased plural of the child collection.
 * @param childIdVar - The JXA variable holding the child's identifier value.
 */
export function buildNestedTargetExpression(
  parentTarget: string,
  childPlural: string,
  childIdVar: string
): string {
  return `${parentTarget}.${childPlural}.byId(${childIdVar})`
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
 * Build the JXA expression that targets a single resource item by identifier.
 *
 * The structured layer addresses a resource through its primary identifier, but
 * a dictionary-declared identifier is not always runtime-valid via JXA. The
 * manifest's identifier `targeting` selects the expression:
 *
 * - `byId` (default): `app.<plural>.byId(<valueVar>)` — the dictionary id
 *   specifier works at runtime.
 * - `byProperty`: `app.<plural>.whose({ <property>: <valueVar> })[0]` — the
 *   declared identifier throws at runtime (e.g. Calendar's `calendarIdentifier()`),
 *   so the resource is matched on a property that works (e.g. `name`).
 *
 * `valueVar` is the JXA variable/expression holding the lookup value — for the
 * common CRUD path this is the command's required *request parameter* name (the
 * schema-validated key, e.g. `id` / `calendarId`), NOT the runtime property. The
 * targeting `property` (e.g. `name`) is only the JXA `whose` match key.
 *
 * Exported for testing: the emitted text is asserted at the schema level since
 * JXA only runs against a live app (not in CI).
 *
 * @param resource - The resource being targeted (may be undefined).
 * @param resourcePlural - The lowercased plural collection name (e.g. `calendars`).
 * @param valueVar - The JXA variable/expression holding the lookup value.
 * @returns The JXA expression evaluating to the targeted item.
 */
export function buildTargetExpression(
  resource: Resource | undefined,
  resourcePlural: string,
  valueVar: string
): string {
  const targeting = resolveIdentifierTargeting(resource)
  if (targeting?.strategy === 'byProperty') {
    // Match on the runtime-working property (e.g. `name`) since the declared
    // identifier is not addressable via byId() at runtime.
    return `app.${resourcePlural}.whose({ ${targeting.property}: ${valueVar} })[0]`
  }
  // Default: the dictionary id specifier works at runtime.
  return `app.${resourcePlural}.byId(${valueVar})`
}

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
  const allPropNames = resolveListOutputProperties(resource)

  // Resolve how the resource is targeted at runtime. The canonical `id` must
  // mirror the property the runtime ACTUALLY uses to address the resource:
  // - byId: the declared identifier property (e.g. `uid`).
  // - byProperty: the runtime-working property (e.g. `name`), because the
  //   declared identifier (e.g. `calendarIdentifier`) throws via JXA and get/
  //   delete/create target by that working property instead.
  // The runtime-identifier read is load-bearing — it must NOT be wrapped in a
  // silent try/catch. A live `calendars.list` previously swallowed the failing
  // `calendarIdentifier()` read, leaving items with no usable id and no signal.
  // If the configured runtime identifier read throws, that surfaces (the whole
  // list command fails with a real error) instead of returning empty ids.
  const targeting = resolveIdentifierTargeting(resource)
  const runtimeIdProperty = targeting?.property
  const declaredIdProperty = resolvePrimaryIdentifierProperty(resource)

  // For a `byProperty` resource the declared identifier property (e.g.
  // `calendarIdentifier`) is precisely the one that throws via JXA at runtime —
  // it is the whole reason targeting falls back to a working property. We must
  // NOT call `item.calendarIdentifier()` for it (that re-introduces the throw);
  // its value is instead mirrored from the working property in the alias below.
  const skipPropertyRead =
    targeting?.strategy === 'byProperty' &&
    declaredIdProperty !== undefined &&
    declaredIdProperty !== runtimeIdProperty
      ? declaredIdProperty
      : undefined

  // Non-identifier properties are read via a hybrid two-path strategy.
  // The runtime-identifier property is excluded here and emitted separately
  // (unswallowed), as is any non-runtime-valid declared identifier
  // (skipPropertyRead) — the alias below mirrors the working property into the
  // declared identifier key so output shape is preserved.
  //
  // Issue #89: the per-property accessor loop (item.p1(); item.p2(); ...) was
  // O(items × properties) AppleEvents. For 35 Calendar events × 13 properties
  // that is ~455 round-trips / 37 s — enough to exceed the JXA runner timeout.
  //
  // Fast path (try): item.properties() is ONE AppleEvent per item, collapsing
  // N×M to ~N. This works for most resources (e.g. events).
  //
  // Fallback (catch): some items' properties() call throws (e.g. Calendar items
  // whose calendarIdentifier accessor fails with -10000 when read as part of the
  // full record). In that case fall back to the original per-field loop with
  // individual try/catch per field so one bad property cannot fail the whole item.
  const bestEffortProps = allPropNames.filter(
    (p) => p !== runtimeIdProperty && p !== skipPropertyRead
  )

  // Fast-path: copy manifest-declared keys from the batched properties() record.
  // Fields absent from the record are simply undefined (same outcome as old try/catch).
  const fastPathPropReads = bestEffortProps
    .map((p) => `if (props.${p} !== undefined) { obj.${p} = props.${p}; }`)
    .join('\n          ')

  // Fallback: per-field reads, each wrapped in its own try/catch so one throwing
  // field (e.g. calendarIdentifier) does not abort the remaining fields.
  const fallbackPropReads = bestEffortProps
    .map((p) => `try { obj.${p} = item.${p}(); } catch(e) {}`)
    .join('\n          ')

  // The runtime identifier read is emitted WITHOUT a swallowing catch so a
  // misconfigured identifier surfaces as a real error rather than a silent
  // empty id (the regression issue #81 documents).
  // In the fast path the value comes from the already-fetched props record.
  // In the fallback path it is read directly from the item accessor — same
  // unswallowed semantics.
  const idReadFast =
    runtimeIdProperty !== undefined ? `obj.${runtimeIdProperty} = props.${runtimeIdProperty};` : ''
  const idReadFallback =
    runtimeIdProperty !== undefined ? `obj.${runtimeIdProperty} = item.${runtimeIdProperty}();` : ''

  // Expose the runtime identifier value under the canonical `id` key so a
  // consumer can always read `item.id` regardless of the app's property name.
  // For byProperty resources this is the working property (`name`); for byId it
  // is the declared identifier property — both are the value get/delete/create
  // accept as the lookup. We also mirror the declared identifier property name
  // when it differs from the runtime property, so output remains shape-stable
  // for consumers that read the declared name directly.
  const idAlias =
    runtimeIdProperty !== undefined
      ? `obj.${CANONICAL_IDENTIFIER_KEY} = obj.${runtimeIdProperty};` +
        (declaredIdProperty !== undefined && declaredIdProperty !== runtimeIdProperty
          ? `\n        obj.${declaredIdProperty} = obj.${runtimeIdProperty};`
          : '')
      : ''

  // Combine fast-path and fallback into a single try/catch block so the template
  // stays flat. The identifier reads are inside the block so `props` is in scope
  // for the fast path and `item` is used directly in the fallback.
  const itemReadBlock = `try {
          var props = item.properties();
          ${fastPathPropReads}
          ${idReadFast}
        } catch(e) {
          ${fallbackPropReads}
          ${idReadFallback}
        }`

  // Resolve the required parent identifier parameter (if any) so the JXA can
  // scope the list to the parent resource. The parent param is the first
  // required command parameter that is NOT one of the listed resource's own
  // properties (e.g. `calendarId` for `listEvents`). Its name — the
  // schema-validated request key bound by paramAssignments — is what we use in
  // the byId(...) call, never the parent resource's identifier property.
  const parentParam = command?.parameters.find(
    (p) => p.required && !Object.hasOwn(resource?.properties ?? {}, p.name)
  )

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
    let parentResource: Resource | undefined
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
          parentResource = res
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

    // Target the parent honoring its identifier targeting strategy, so a parent
    // whose declared id is not runtime-valid (e.g. Calendar) is matched on its
    // working property instead of an `byId()` that throws.
    const parentTarget = buildTargetExpression(parentResource, parentPlural, parentIdParam)
    collectionExpr = `${parentTarget}.${resourcePlural}()`
  }

  return `
      ${paramAssignments}
      // List ${resourcePlural}
      var items = ${collectionExpr};
      // Hybrid property reads: fast path (item.properties() — one AppleEvent per
      // item) with a per-field fallback for items whose properties() call throws
      // (e.g. Calendar items where calendarIdentifier accessor fails with -10000).
      var result = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var obj = {};
        ${itemReadBlock}
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
      // Date-typed params arrive as ISO strings over JSON; rehydrate them as
      // JXA Date objects (a raw string makes Calendar's make/push throw).
      if (p.type === 'date') {
        return `var ${p.name} = new Date(${JSON.stringify(value)});`
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
    // Get by identifier. When the command declares a parent scope parameter (a
    // required param NOT present in the child resource's own properties, e.g.
    // `calendarId` on `getEvent`), the child is nested under the parent and must
    // be targeted as `<parentTarget>.<childPlural>.byId(<childId>)` instead of
    // `app.<childPlural>.byId(<childId>)`. Calendar events are the canonical case:
    // `app.events.byId(uid)` throws -1728 because events are not a top-level JXA
    // collection; they must be reached via the calendar specifier.
    //
    // When no parent scope exists, fall back to the flat top-level target
    // (honoring byId vs byProperty targeting as before).
    //
    // The lookup variable name MUST be the command's non-parent required *parameter*
    // name (e.g. `id`) — the key the request schema validates.
    const parentScope = resolveParentScope(command, resource, manifest)
    const identifierParam =
      command.parameters.find((p) => p.required && p.name !== parentScope?.parentIdParam)?.name ??
      'id'

    // Validate required params before building JXA.
    if (parentScope !== undefined && args[parentScope.parentIdParam] === undefined) {
      return Promise.reject(
        Object.assign(new Error(`Missing required parameter: ${parentScope.parentIdParam}`), {
          code: 'VALIDATION_ERROR',
        })
      )
    }
    if (args[identifierParam] === undefined) {
      return Promise.reject(
        Object.assign(new Error(`Missing required parameter: ${identifierParam}`), {
          code: 'VALIDATION_ERROR',
        })
      )
    }

    const propNames = resource?.properties ? Object.keys(resource.properties) : ['name']

    const targetExpr =
      parentScope !== undefined
        ? buildNestedTargetExpression(parentScope.parentTarget, resourcePlural, identifierParam)
        : buildTargetExpression(resource, resourcePlural, identifierParam)

    code = `
      ${paramAssignments}
      // Get ${resource?.name ?? 'item'} by identifier
      var item = ${targetExpr};
      var obj = {};
      ${propNames.map((p) => `try { obj.${p} = item.${p}(); } catch(e) {}`).join('\n      ')}
      return obj;
    `
  } else if (command.name === 'delete') {
    // Delete by identifier. Mirrors the get branch: when a parent scope parameter
    // exists (required param not in child resource's own properties), target the
    // child via `<parentTarget>.<childPlural>.byId(<childId>)`. This is required
    // for nested resources like Calendar events. Falls back to flat top-level
    // targeting for non-nested resources.
    //
    // If the command declares no required parameter at all (e.g. System Events
    // DiskItem delete), fall through to the generic handler.
    const parentScope = resolveParentScope(command, resource, manifest)
    const identifierParam = command.parameters.find(
      (p) => p.required && p.name !== parentScope?.parentIdParam
    )?.name

    if (identifierParam !== undefined) {
      // Guard: emit structured errors if required params are absent.
      if (parentScope !== undefined && args[parentScope.parentIdParam] === undefined) {
        return Promise.reject(
          Object.assign(new Error(`Missing required parameter: ${parentScope.parentIdParam}`), {
            code: 'VALIDATION_ERROR',
          })
        )
      }
      if (args[identifierParam] === undefined) {
        return Promise.reject(
          Object.assign(new Error(`Missing required parameter: ${identifierParam}`), {
            code: 'VALIDATION_ERROR',
          })
        )
      }

      const targetExpr =
        parentScope !== undefined
          ? buildNestedTargetExpression(parentScope.parentTarget, resourcePlural, identifierParam)
          : buildTargetExpression(resource, resourcePlural, identifierParam)

      code = `
      ${paramAssignments}
      // Delete ${resource?.name ?? 'item'} by identifier
      var item = ${targetExpr};
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
    // `listId` for createReminder), it is the required *parameter* whose name
    // is NOT one of the resource's own writable properties (those are the
    // props we set on the new item). The parent BINDING name is therefore the
    // command parameter name — the schema-validated request key — never the
    // parent resource's identifier property. We use the manifest only to map
    // that param to the parent resource's plural for collection access.
    const resourceName = resource?.name ?? 'Item'

    const parentParam = command.parameters.find(
      (p) => p.required && !Object.hasOwn(resource?.properties ?? {}, p.name)
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

      // Resolve the parent resource by matching the param name against each
      // resource's primary identifier or name — manifest-driven, not hardcoded.
      let parentResource: Resource | undefined
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
          parentResource = res
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

      // Target the parent honoring its identifier targeting strategy, so a parent
      // whose declared id is not runtime-valid (e.g. Calendar) is matched on its
      // working property (`name`) instead of a `byId()` that throws.
      const parentTarget = buildTargetExpression(parentResource, parentPlural, parentIdParam)

      code = `
        ${paramAssignments}
        // Create ${resourceName} within parent (${parentIdParam})
        var parent = ${parentTarget};
        var props = {${props.join(', ')}};
        var item = app.${resourceName}(props);
        // Append to the parent's element collection. item.make({ at: ... }) throws
        // -10024 "Can't make or move that element into that container" in JXA;
        // pushing onto the parent specifier's collection is the working idiom.
        parent.${resourcePlural}.push(item);
        return item.properties();
      `
    } else {
      // No parent identifier: create at the top level.
      const props = command.parameters.filter((p) => args[p.name] !== undefined).map((p) => p.name)

      // TODO(#81 follow-up): top-level `item.make()` is unverified against a live app
      // and likely shares the within-parent -10024 idiom bug; the working form is
      // probably `app.${resourcePlural}.push(item)`. Verify live before relying on it.
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
    // Update by identifier. Mirrors the get branch: when a parent scope parameter
    // exists, target the child via `<parentTarget>.<childPlural>.byId(<childId>)`.
    // This is required for nested resources like Calendar events where
    // `app.events.byId(uid)` is not settable (-10006) but
    // `app.calendars.whose({name: calendarId})[0].events.byId(uid)` is.
    const parentScope = resolveParentScope(command, resource, manifest)
    const identifierParam =
      command.parameters.find((p) => p.required && p.name !== parentScope?.parentIdParam)?.name ??
      'id'

    // Guard: emit structured errors if required params are absent.
    if (parentScope !== undefined && args[parentScope.parentIdParam] === undefined) {
      return Promise.reject(
        Object.assign(new Error(`Missing required parameter: ${parentScope.parentIdParam}`), {
          code: 'VALIDATION_ERROR',
        })
      )
    }
    if (args[identifierParam] === undefined) {
      return Promise.reject(
        Object.assign(new Error(`Missing required parameter: ${identifierParam}`), {
          code: 'VALIDATION_ERROR',
        })
      )
    }

    // Collect the writable fields: all provided params that are neither the child
    // identifier nor the parent scope param.
    const excludedParams = new Set(
      [identifierParam, parentScope?.parentIdParam].filter(Boolean) as string[]
    )
    const writableFields = command.parameters
      .filter((p) => !excludedParams.has(p.name) && args[p.name] !== undefined)
      .map((p) => p.name)

    // Generate a property-assignment statement for each updated field.
    const fieldAssignments = writableFields
      .map((fieldName) => `try { item.${fieldName} = ${fieldName}; } catch(e) {}`)
      .join('\n      ')

    const targetExpr =
      parentScope !== undefined
        ? buildNestedTargetExpression(parentScope.parentTarget, resourcePlural, identifierParam)
        : buildTargetExpression(resource, resourcePlural, identifierParam)

    code = `
      ${paramAssignments}
      // Update ${resource?.name ?? 'item'} by identifier
      var item = ${targetExpr};
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
 * @param governance - Optional governance context, forwarded to every per-app
 *   router. Defaults to allow-all (enforcement is a no-op).
 * @returns Combined Hono router
 */
export function createMultiAppRpcRouter(
  manifests: AppManifest[],
  governance: GovernanceContext = { policy: ALLOW_ALL_POLICY }
): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>()

  for (const manifest of manifests) {
    const router = createRpcRouter(manifest, governance)
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
