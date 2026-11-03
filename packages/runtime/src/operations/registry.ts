/**
 * The runtime's operation registry: which operations exist, what each
 * requires, and which app manifest executes it.
 *
 * Operations enter the registry when an app is registered, either from its
 * manifest alone or from a generated contract checked against its manifest.
 * The manifest is the authority on identity and permission in both cases: an
 * operation's id and required permission are derived from the manifest
 * command exactly as the RPC router derives them, and a contract descriptor
 * that disagrees is refused at registration. A stale or altered package can
 * therefore never widen what a credential authorizes.
 *
 * Registration fails closed and atomically: a conflicting or mismatched
 * operation, or an app whose route segment is reserved, rejects the whole
 * registration, and nothing from it is added.
 *
 * @packageDocumentation
 */

import type { AppManifest, Command, PermissionHistoryEntry, RiskClass } from '@macts/core'
import {
  classifyCommandRisk,
  contractResourcePlans,
  listOperationPages,
  normalizeAppRouteSegment,
  resolveCommandRoutes,
} from '@macts/core'
import {
  EMPTY_RESOURCE_PLAN_TABLE,
  PAGING_INPUT_NAMES,
  resourcePlanTable,
  type AnyOperationDescriptor,
  type AppContract,
  type OperationId,
  type OperationTarget,
  type PermissionString,
  type ResourcePlanTable,
  type ValuePlan,
  type ValueType,
} from '@macts/contracts'
import { PASSTHROUGH_OUTPUT_TYPE, passthroughInputType } from './passthrough.js'
import { buildCommandSchema } from './request-schema.js'

/**
 * One operation the runtime can invoke.
 *
 * @remarks
 * Pairs the descriptor callers address with the manifest-side facts the
 * pipeline enforces: the risk class governance evaluates, and the permission
 * history that explains a denial after a permission was renamed.
 */
export interface RegisteredOperation {
  /** The operation's identity, permission, target, and value contracts. */
  readonly descriptor: AnyOperationDescriptor
  /** The validated manifest of the app that executes the operation. */
  readonly manifest: AppManifest
  /** The command's risk class, as governance evaluates it. */
  readonly risk: RiskClass
  /** The command's permission renames, newest first, when it has any. */
  readonly permissionHistory?: PermissionHistoryEntry[]
  /**
   * The value plans of the app's resources, which the executor needs to
   * convert references: derived from the app's contract when the operation
   * was registered from one, and empty when it was registered from the
   * manifest alone, so no reference converts.
   */
  readonly resources: ResourcePlanTable
}

/**
 * Registration was refused because an operation conflicts with one already
 * registered, or a contract disagrees with its manifest.
 *
 * @remarks
 * A configuration failure raised while an app is being registered, never an
 * invocation outcome, so it is not one of the canonical structured errors.
 */
export class OperationRegistrationError extends Error {
  /** Identifies registration failures in logs and serialized errors. */
  override readonly name = 'OperationRegistrationError'
}

/**
 * Names that can never be an app's route segment.
 *
 * @remarks
 * Each names a namespace or route that a macts host serves, or will serve,
 * beside the apps, so an app spelled the same way would collide with it on
 * some surface:
 *
 * - `rpc`: the operation routes, `/api/v1/rpc/<operation id>` over HTTP;
 * - `introspect`: the operation listings, `/api/v1/introspect` over HTTP,
 *   which predate the namespace rule and stay under `/api/v1` for
 *   compatibility;
 * - `references`: reference resolution (`/references/v1` over HTTP), which
 *   resolves references of every app;
 * - `transfers`: binary transfers, which will move file bytes for every app at
 *   `/transfers/v1` over HTTP. Nothing is served there yet; the name is
 *   reserved so that no app can claim it first.
 *
 * The runtime refuses an app with any of these route segments at registration
 * (`registerManifest` and `registerContract`), so no host, HTTP or otherwise,
 * can serve one. A segment is compared after normalization
 * (`normalizeAppRouteSegment` in `@macts/core`), the spelling every surface
 * uses.
 */
export const RESERVED_APP_ROUTE_SEGMENTS: readonly string[] = Object.freeze([
  'introspect',
  'rpc',
  'references',
  'transfers',
])

/**
 * Refuse an app whose route segment is reserved.
 *
 * @throws {@link OperationRegistrationError} when the manifest's app route
 *   segment is one of {@link RESERVED_APP_ROUTE_SEGMENTS}.
 */
function assertAppSegmentNotReserved(manifest: AppManifest): void {
  const segment = normalizeAppRouteSegment(manifest.app.name)
  if (RESERVED_APP_ROUTE_SEGMENTS.includes(segment)) {
    throw new OperationRegistrationError(
      `App "${manifest.app.name}" cannot be registered: its route segment "${segment}" is reserved for the routes macts serves beside the apps (reserved: ${RESERVED_APP_ROUTE_SEGMENTS.join(', ')})`
    )
  }
}

/** What the manifest alone says about one operation. */
interface ManifestOperation {
  readonly id: OperationId
  readonly permission: PermissionString
  readonly target: OperationTarget
  readonly command: Command
  /** Whether the manifest says this operation pages (see `listOperationPages`). */
  readonly pages: boolean
}

/** Whether `value` has the `app.resource.command` shape of an operation id. */
function isOperationId(value: string): value is OperationId {
  return value.split('.').length >= 3
}

/** Whether `value` has the `app:resource:operation` shape of a permission. */
function isPermissionString(value: string): value is PermissionString {
  return value.split(':').length >= 3
}

/**
 * Derive every operation the manifest exposes, one per RPC route.
 *
 * @throws {@link OperationRegistrationError} when a route or permission does
 *   not have the three-segment form an operation requires.
 */
function deriveManifestOperations(manifest: AppManifest): ManifestOperation[] {
  const operations: ManifestOperation[] = []
  for (const [commandKey, command] of Object.entries(manifest.commands)) {
    for (const route of resolveCommandRoutes(manifest, commandKey, command)) {
      const id = route.route
      if (!isOperationId(id)) {
        throw new OperationRegistrationError(
          `Manifest route "${id}" is not a valid operation id (expected app.resource.command)`
        )
      }
      // The resolved route's permission: the command's declared permission, or
      // derived from its route segment (`routeName`, else the command key),
      // exactly as the RPC router enforces it.
      const permission = route.permission
      if (!isPermissionString(permission)) {
        throw new OperationRegistrationError(
          `Operation "${id}" declares permission "${permission}", which is not of the form app:resource:operation`
        )
      }
      const target: OperationTarget =
        route.resourceType === undefined
          ? { command: commandKey }
          : { command: commandKey, resource: route.resourceType }
      operations.push({
        id,
        permission,
        target,
        command,
        pages: listOperationPages(command, route.resource),
      })
    }
  }
  return operations
}

/** Combine a descriptor with the manifest-side facts for its command. */
function toRegisteredOperation(
  descriptor: AnyOperationDescriptor,
  manifest: AppManifest,
  command: Command,
  resources: ResourcePlanTable
): RegisteredOperation {
  return {
    descriptor,
    manifest,
    resources,
    risk: classifyCommandRisk(command),
    ...(command.permissionHistory === undefined
      ? {}
      : { permissionHistory: command.permissionHistory }),
  }
}

/**
 * Build a registered operation for every RPC route a manifest exposes.
 *
 * @remarks
 * Ids, permissions, and targets match the RPC router exactly: the id is the
 * resolved route (`ManifestRoute.route`, keyed by the command's `routeName`,
 * else its key), the permission is the resolved route's permission
 * (`ManifestRoute.permission`, which honours `routeName`), the target names
 * the manifest command key, and a command scoped to several resource types
 * yields one operation per type.
 *
 * The descriptors use passthrough value types: the input is validated against
 * the command's request schema and must be plain JSON, and the output is any
 * JSON value. They stand in for generated descriptors until generated contracts
 * carry value types, and the generator never produces them.
 *
 * @param manifest - A validated app manifest.
 * @returns One registered operation per route, in command-declaration order.
 * @throws {@link OperationRegistrationError} when the app's route segment is
 *   reserved ({@link RESERVED_APP_ROUTE_SEGMENTS}), or a route or permission
 *   is not in operation form.
 */
export function operationsFromManifest(manifest: AppManifest): RegisteredOperation[] {
  assertAppSegmentNotReserved(manifest)
  const inputTypes = new Map<string, ValueType<unknown>>()
  return deriveManifestOperations(manifest).map(({ id, permission, target, command }) => {
    let input = inputTypes.get(target.command)
    if (input === undefined) {
      input = passthroughInputType(buildCommandSchema(command))
      inputTypes.set(target.command, input)
    }
    const descriptor: AnyOperationDescriptor = {
      id,
      permission,
      target,
      description: command.description,
      input,
      output: PASSTHROUGH_OUTPUT_TYPE,
    }
    return toRegisteredOperation(descriptor, manifest, command, EMPTY_RESOURCE_PLAN_TABLE)
  })
}

/** Whether two operation targets name the same manifest command and resource. */
function sameTarget(a: OperationTarget, b: OperationTarget): boolean {
  return a.command === b.command && a.resource === b.resource
}

/**
 * Check a generated contract against its manifest and build its registered
 * operations.
 *
 * @remarks
 * Every descriptor must name an operation the manifest exposes, under the key
 * it is filed by, with exactly the manifest-derived permission and target.
 * Checking the target as well as the permission matters: a descriptor that
 * kept a read permission but pointed at a destructive command would otherwise
 * run that command under the read grant. A descriptor also takes the paging
 * inputs exactly when the manifest says its list pages (`listOperationPages`),
 * so a contract generated before an identifier's uniqueness claim changed is
 * refused rather than paging a list that cannot be anchored reliably.
 *
 * A contract may cover a subset of the manifest's operations. Its resource
 * table must agree with the manifest too: every resource it lists is one the
 * manifest declares, with the identifier type of the manifest's primary
 * identifier property. Each registered operation carries the table's value
 * plans (`resourcePlanTable`).
 *
 * Exported so a contract can be checked against its manifest without
 * constructing a runtime, for example when verifying generated packages.
 *
 * @param contract - The generated app contract.
 * @param manifest - The validated manifest the contract was generated from.
 * @returns One registered operation per contract descriptor, using the
 *   contract's descriptors.
 * @throws {@link OperationRegistrationError} on any disagreement, or when the
 *   app's route segment is reserved ({@link RESERVED_APP_ROUTE_SEGMENTS}).
 */
export function operationsFromContract(
  contract: AppContract<unknown>,
  manifest: AppManifest
): RegisteredOperation[] {
  assertAppSegmentNotReserved(manifest)
  const appSegment = normalizeAppRouteSegment(manifest.app.name)
  if (contract.app !== appSegment) {
    throw new OperationRegistrationError(
      `Contract for app "${contract.app}" does not match manifest app "${appSegment}"`
    )
  }

  const resources = checkedResourcePlans(contract, manifest)
  const derived = new Map(deriveManifestOperations(manifest).map((op) => [op.id, op]))
  return Object.entries(contract.operations).map(([key, descriptor]) => {
    if (key !== descriptor.id) {
      throw new OperationRegistrationError(
        `Contract files operation "${descriptor.id}" under the key "${key}"`
      )
    }
    const expected = derived.get(descriptor.id)
    if (expected === undefined) {
      throw new OperationRegistrationError(
        `Contract operation "${descriptor.id}" does not exist in the ${appSegment} manifest`
      )
    }
    if (descriptor.permission !== expected.permission) {
      throw new OperationRegistrationError(
        `Contract operation "${descriptor.id}" declares permission "${descriptor.permission}", but the manifest requires "${expected.permission}"`
      )
    }
    if (!sameTarget(descriptor.target, expected.target)) {
      throw new OperationRegistrationError(
        `Contract operation "${descriptor.id}" targets a different manifest command than the manifest route does`
      )
    }
    if (takesPagingInputs(descriptor) !== expected.pages) {
      throw new OperationRegistrationError(
        expected.pages
          ? `Contract operation "${descriptor.id}" does not take the paging inputs, but the manifest says its list pages. Regenerate the contract.`
          : `Contract operation "${descriptor.id}" takes the paging inputs, but the manifest says it does not page: its resource's primary identifier is not claimed unique. Regenerate the contract.`
      )
    }
    return toRegisteredOperation(descriptor, manifest, expected.command, resources)
  })
}

/** Whether a descriptor's input record declares every paging input. */
function takesPagingInputs(descriptor: AnyOperationDescriptor): boolean {
  const { plan } = descriptor.input
  return (
    plan.kind === 'record' && PAGING_INPUT_NAMES.every((name) => Object.hasOwn(plan.fields, name))
  )
}

/**
 * The value plans of the contract's resources, after checking each against
 * the plans a contract generated from the manifest carries.
 *
 * @remarks
 * A reference's identifier is converted by its resource's identifier plan, so
 * a contract whose identifier type disagrees with the manifest's primary
 * identifier property (an integer where the manifest declares text, or an
 * identifier the manifest does not declare) would convert identifiers wrongly
 * and address the wrong object, or none. Such a contract is refused, as is one
 * that lists a resource the manifest does not have.
 *
 * @throws {@link OperationRegistrationError} naming the resource and both
 *   identifier types.
 */
function checkedResourcePlans(
  contract: AppContract<unknown>,
  manifest: AppManifest
): ResourcePlanTable {
  const resources = resourcePlanTable(contract.resources)
  const expected = contractResourcePlans(manifest)
  for (const [resource, plans] of Object.entries(resources)) {
    const manifestPlans = Object.hasOwn(expected, resource) ? expected[resource] : undefined
    if (manifestPlans === undefined) {
      throw new OperationRegistrationError(
        `The ${contract.app} contract lists resource "${resource}", which the manifest does not declare. Regenerate the contract.`
      )
    }
    if (!samePlan(plans.id, manifestPlans.id)) {
      throw new OperationRegistrationError(
        `The ${contract.app} contract gives resource "${resource}" ${describeIdentifierPlan(plans.id)}, but its manifest gives it ${describeIdentifierPlan(manifestPlans.id)}. Regenerate the contract.`
      )
    }
  }
  return resources
}

/** An identifier plan for a registration message: the plan as JSON, or that there is none. */
function describeIdentifierPlan(plan: ValuePlan | undefined): string {
  return plan === undefined ? 'no identifier' : `the identifier plan ${JSON.stringify(plan)}`
}

/**
 * Whether two identifier plans describe the same value. Plans are JSON data,
 * so they are compared structurally, with record keys in any order.
 */
function samePlan(a: ValuePlan | undefined, b: ValuePlan | undefined): boolean {
  return sameJson(a, b)
}

/** Whether a JSON value is a record: an object that is not a list. */
function isJsonRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Structural equality of two JSON values. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item: unknown, index) => sameJson(item, b[index]))
    )
  }
  if (!isJsonRecord(a) || !isJsonRecord(b)) return false
  const keys = Object.keys(a)
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]))
  )
}

/**
 * The set of registered operations, keyed by id.
 *
 * @remarks
 * Ids are unique across every registered app. {@link OperationRegistry.add}
 * checks a whole batch before inserting any of it, so a refused registration
 * leaves the registry unchanged.
 */
export class OperationRegistry {
  readonly #operations = new Map<string, RegisteredOperation>()

  /**
   * Add a batch of operations.
   *
   * @throws {@link OperationRegistrationError} when an id is already
   *   registered or repeats within the batch.
   */
  add(operations: readonly RegisteredOperation[]): void {
    const incoming = new Set<string>()
    for (const { descriptor } of operations) {
      if (this.#operations.has(descriptor.id) || incoming.has(descriptor.id)) {
        throw new OperationRegistrationError(`Operation "${descriptor.id}" is already registered`)
      }
      incoming.add(descriptor.id)
    }
    for (const operation of operations) {
      this.#operations.set(operation.descriptor.id, operation)
    }
  }

  /** The operation registered under `id`, if any. */
  get(id: string): RegisteredOperation | undefined {
    return this.#operations.get(id)
  }

  /** Every registered operation, in registration order. */
  list(): readonly RegisteredOperation[] {
    return [...this.#operations.values()]
  }
}
