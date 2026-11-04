/**
 * Native invocation bodies: the automation-process JavaScript that carries out
 * one manifest-defined operation against a target app, or reads the records a
 * resolved reference denotes.
 *
 * Each body is a function body run as `(app, args, page)` (see
 * `NativeScript.body`): `app` is the target application, `args` is the
 * operation's input record, and `page` is the window a paged list reads
 * (`null` for every other body).
 * The bodies encode live-app behavior that the manifest alone does not express:
 *
 * - a command on a nested resource reaches its target through the parent the
 *   manifest records for it (`command.parent`): the parent resource's
 *   collection, the parent item in it, then the resource's collection under
 *   that item (Calendar events exist only under a calendar, never as a
 *   collection of the application). The parent is never inferred from a
 *   parameter's name or position, and a command that records none addresses
 *   its resource's collection at the application;
 * - an identifier is targeted by id or by matching a working property, as the
 *   manifest's identifier targeting declares;
 * - lists read each property once across the items they list and assemble
 *   records by index, checking that every read covers the same items in the
 *   same order; a list that pages reads one window of its collection, checked
 *   against the previous page's last item in the same request;
 * - a child is created inside its parent by appending it to the parent's
 *   collection;
 * - the request parameter that carries an identifier is distinct from the
 *   resource property that holds it;
 * - the app is addressed by its own spelling of each collection and property
 *   (`../manifest/native-accessor.ts`), while every record a body returns is
 *   keyed by the manifest's public property names, so no app spelling reaches
 *   the caller.
 *
 * No input value is ever written into a body. Every argument is read at run
 * time as `args["<name>"]`, so the source text depends only on the manifest and
 * the operation target. Manifest-derived names (properties, collections,
 * commands, resource classes) are trusted manifest data, but they are still
 * emitted as JSON string literals in bracket form wherever the syntax allows, so
 * an unusual manifest key cannot change the meaning of the script.
 *
 * A body references only `app`, `args`, `page`, its own locals, and standard
 * ECMAScript built-ins: no host globals, no codec bindings, and no per-call state. That
 * keeps a body independent of how it is run, so a long-lived automation
 * process can compile it once and invoke it for many calls.
 *
 * @packageDocumentation
 */

import { InternalError, ValidationError, type OperationTarget } from '@macts/contracts'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { Command, CommandParameter } from '../manifest/schemas/command.js'
import type { Resource } from '../manifest/schemas/resource.js'
import {
  CANONICAL_IDENTIFIER_KEY,
  listOperationPages,
  resolveCanonicalIdentifierSource,
  resolveIdentifierTargeting,
  resolveListOutputProperties,
  resolvePrimaryIdentifierProperty,
} from '../manifest/identifier.js'
import { resolveCollectionAccessor, resolvePropertyAccessor } from '../manifest/native-accessor.js'
import { omittedOutputProperties, outputProperties } from '../manifest/output-references.js'
import { resolvingCommand } from '../manifest/resource-commands.js'
import {
  NATIVE_CODEC_ERROR_NAME,
  NATIVE_COLLECTION_CHANGED_ERROR_NAME,
  type NativeAddressing,
} from './native-codec.js'

/**
 * Everything needed to run one operation natively, derived from the manifest
 * and the operation target alone.
 */
export interface NativeInvocationPlan {
  /** Function body run as `(app, args, page)`. */
  readonly body: string
  /**
   * Input keys the body cannot run without. The command's required parameters,
   * plus the identifier keys the body addresses its target by. A missing key is
   * a caller error, reported before anything runs.
   */
  readonly requiredArguments: readonly string[]
}

/**
 * How a body shapes the records it returns.
 */
export interface NativeBodyOptions {
  /**
   * Add the legacy identifier aliases to list items: the identifier value
   * under the stable key `id`, and, when a resource is matched on a working
   * property instead of its declared identifier, that property's value
   * mirrored into the declared identifier field.
   *
   * Only operations whose output passes through unconverted want these: their
   * callers pass `item.id` back as the `id` request parameter. A typed output
   * contract declares its record fields exactly and derives references from
   * the record itself. Its encode silently drops undeclared keys such as `id`,
   * but a mirrored identifier field is declared, so encode would accept it
   * holding another property's value. A typed body must therefore produce only
   * the declared fields, each holding its own value. Defaults to `false`.
   */
  readonly identifierAliases?: boolean
  /**
   * Build a list body that reads one page window, given as the body's third
   * argument, and returns a page window result, instead of reading the whole
   * collection into an array (see `PageWindow` and `PageWindowResult`).
   * Meaningful only for a list command of a resource with an identifier.
   * Defaults to `false`.
   */
  readonly paged?: boolean
}

/**
 * Build the native function body for one operation.
 *
 * @param manifest - The validated manifest of the target app.
 * @param target - The manifest command (and resource) to run.
 * @param options - How returned records are shaped.
 * @returns A function body run as `(app, args, page)`.
 * @throws `InternalError` when `target` names a command the manifest does not
 *   declare.
 */
export function buildNativeBody(
  manifest: AppManifest,
  target: OperationTarget,
  options: NativeBodyOptions = {}
): string {
  return planNativeInvocation(manifest, target, options).body
}

/**
 * Derive the native body and the input keys it requires for one operation.
 *
 * @throws `InternalError` when `target` names a command the manifest does not
 *   declare: the operation and the manifest disagree, which is a macts defect.
 */
export function planNativeInvocation(
  manifest: AppManifest,
  target: OperationTarget,
  options: NativeBodyOptions = {}
): NativeInvocationPlan {
  const command = Object.hasOwn(manifest.commands, target.command)
    ? manifest.commands[target.command]
    : undefined
  if (command === undefined) {
    throw new InternalError('The operation does not match any command of its app.', {})
  }
  const requiredParameters = command.parameters.filter((p) => p.required).map((p) => p.name)

  if (command.scope === 'application') {
    return { body: buildCommandCallBody(command), requiredArguments: requiredParameters }
  }

  const resource =
    target.resource !== undefined && Object.hasOwn(manifest.resources, target.resource)
      ? manifest.resources[target.resource]
      : undefined
  const { body, identifierArguments } = buildResourceBody(
    command,
    resource,
    manifest,
    options.identifierAliases === true,
    options.paged === true
  )
  return {
    body,
    requiredArguments: [...new Set([...requiredParameters, ...identifierArguments])],
  }
}

/**
 * Find input keys from `required` that `input` does not supply, and reject the
 * call if there are any.
 *
 * @throws `ValidationError` listing each missing key.
 */
export function assertRequiredArguments(
  required: readonly string[],
  input: Readonly<Record<string, unknown>>
): void {
  const missing = required.filter(
    (name) => !Object.hasOwn(input, name) || input[name] === undefined
  )
  if (missing.length === 0) return
  throw new ValidationError(
    missing.length === 1
      ? `Missing required parameter: ${String(missing[0])}`
      : `Missing required parameters: ${missing.join(', ')}`,
    {
      issues: missing.map((name) => ({ path: [name], message: 'Required parameter is missing' })),
    }
  )
}

// ---------------------------------------------------------------------------
// Source-text helpers. Every name passes through `literal`, so no manifest key
// is ever spliced into source as raw text.
// ---------------------------------------------------------------------------

/** A JSON string literal, which is also a valid JavaScript string literal. */
function literal(text: string): string {
  return JSON.stringify(text)
}

/** Member access on `expression` by a manifest-derived name. */
function member(expression: string, name: string): string {
  return `${expression}[${literal(name)}]`
}

/** Read of one input argument. */
function argument(name: string): string {
  return member('args', name)
}

/**
 * Read of one input argument as the native value the app expects. Date
 * parameters arrive as ISO strings and must become `Date` objects: apps reject
 * a string where a date is required.
 */
function argumentValue(name: string, parameter: CommandParameter | undefined): string {
  return parameter?.type === 'date' ? `new Date(${argument(name)})` : argument(name)
}

/** Whether the input supplies `name`, evaluated inside the automation process. */
function supplied(name: string): string {
  return `Object.prototype.hasOwnProperty.call(args, ${literal(name)})`
}

/** Join body statements, one per line, dropping empty parts. */
function lines(...parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join('\n')
}

/**
 * Statements that fill the local record `name` with each of `parameters` the
 * input supplies, as native values. Absent optional parameters stay absent.
 *
 * @param fieldName - The record key each parameter is stored under: by
 *   default its own name; the app's spelling of the property it names when
 *   the record is handed to the app as an item's properties.
 */
function collectSuppliedParameters(
  name: string,
  parameters: readonly CommandParameter[],
  fieldName: (parameterName: string) => string = (parameterName) => parameterName
): string {
  return lines(
    `var ${name} = {};`,
    ...parameters.map(
      (p) =>
        `if (${supplied(p.name)}) { ${member(name, fieldName(p.name))} = ${argumentValue(p.name, p)}; }`
    )
  )
}

/**
 * The app's name for a resource's property, from its manifest key (see
 * `resolvePropertyAccessor`): the recorded native spelling, else the key. A
 * name the resource does not declare as a property is addressed as written.
 */
function nativePropertyName(resource: Resource | undefined, key: string): string {
  const property =
    resource !== undefined && Object.hasOwn(resource.properties, key)
      ? resource.properties[key]
      : undefined
  return resolvePropertyAccessor(key, property)
}

/**
 * Statements that build the local record `obj` from the properties one item's
 * output record declares (its usable properties, less those holding a
 * reference macts cannot yet return in a resolvable form, see
 * `outputProperties`), keyed by their
 * public names. get, create and update all return a record built here, so
 * the three cannot drift, and none reads a field the contract leaves out.
 *
 * The read is batched across the item's properties: one `properties()` call,
 * from whose record each usable property is taken under the app's name for it, and
 * stored under its public key. An app's property record need not hold every
 * property it can report (a Finder container's has no `entireContents`), so a
 * usable property absent from the record is read on its own; one the app has
 * no value for is in the record as `null` and costs no extra read. When
 * `properties()` fails (a Calendar calendar's record includes the failing
 * `calendarIdentifier`), each property is read on its own. Every read on its
 * own is by the app's name and guarded, so a property the item cannot report
 * is omitted rather than failing the operation. A body with no resource reads
 * `name`.
 */
function readOutputProperties(
  manifest: AppManifest,
  resource: Resource | undefined,
  itemLocal: string
): string {
  const keys = itemReadKeys(manifest, resource)
  const native = (key: string): string => nativePropertyName(resource, key)
  const readOnItsOwn = (key: string): string =>
    `try { ${member('obj', key)} = ${member(itemLocal, native(key))}(); } catch (e) {}`
  return lines(
    'var obj = {};',
    'try {',
    `var props = ${itemLocal}.properties();`,
    ...keys.map(
      (key) =>
        `if (${member('props', native(key))} !== undefined) { ${member('obj', key)} = ${member('props', native(key))}; } else { ${readOnItsOwn(key)} }`
    ),
    '} catch (e) {',
    ...keys.map(readOnItsOwn),
    '}'
  )
}

/**
 * The public keys of the properties one item's record read takes
 * ({@link readOutputProperties}): the resource's properties that its output
 * record declares (`outputProperties`), or `name` for a body with no resource.
 */
function itemReadKeys(manifest: AppManifest, resource: Resource | undefined): string[] {
  return resource === undefined
    ? ['name']
    : outputProperties(manifest, resource).map(([key]) => key)
}

/**
 * The public keys a list body reads for each item: the list's output
 * properties ({@link resolveListOutputProperties}), less those the output
 * record leaves out (`omittedOutputProperties`). The identifier is never left
 * out, so it is always read.
 */
function listReadKeys(manifest: AppManifest, resource: Resource | undefined): string[] {
  const omitted: ReadonlyMap<string, unknown> =
    resource === undefined ? new Map() : omittedOutputProperties(manifest, resource)
  return resolveListOutputProperties(resource).filter((key) => !omitted.has(key))
}

/** The record keys the native bodies read for one resource, by body. */
export interface NativeReadKeys {
  /** What a get (and a resolved reference) reads from one item. */
  readonly get: readonly string[]
  /** What a list reads across the collection, for each item. */
  readonly list: readonly string[]
}

/**
 * The record keys a get body and a list body read for `resource`.
 *
 * @remarks
 * A resolved identity collection is read with the get body's record read but
 * validated against the list's item plan, so the two must read the same keys.
 * They do while the resource's primary identifier is one of its usable
 * properties: a list also reads the identifier when it is not
 * ({@link resolveListOutputProperties}). Both leave out the same fields, the
 * ones the output record does not declare (`omittedOutputProperties`). A list
 * never reads a declared identifier its targeting matches by another
 * property, and a get's guarded read of it yields nothing, so that key is in
 * both sets yet in neither record.
 *
 * @param manifest - The validated manifest of the resource's app.
 * @param resource - The resource definition from the manifest.
 */
export function nativeReadKeys(
  manifest: AppManifest,
  resource: Resource | undefined
): NativeReadKeys {
  return { get: itemReadKeys(manifest, resource), list: listReadKeys(manifest, resource) }
}

/**
 * Body that calls `command` on the app with the supplied parameters as its
 * named-parameter record, or with no arguments when none are supplied.
 *
 * @param resultLocal - Whether to bind the result to a local before returning
 *   it, as resource-scoped generic commands always have.
 */
function buildCommandCallBody(command: Command, resultLocal = false): string {
  const call = member('app', command.name)
  if (command.parameters.length === 0) {
    return resultLocal ? lines(`var result = ${call}();`, 'return result;') : `return ${call}();`
  }
  const invocation = `Object.keys(params).length > 0 ? ${call}(params) : ${call}()`
  return lines(
    collectSuppliedParameters('params', command.parameters),
    resultLocal ? lines(`var result = ${invocation};`, 'return result;') : `return ${invocation};`
  )
}

// ---------------------------------------------------------------------------
// Targeting
// ---------------------------------------------------------------------------

/**
 * Expression addressing one item of a top-level collection by identifier.
 *
 * The resource's identifier targeting selects the form:
 *
 * - `byId` (the default, and the form for a resource with no identifier):
 *   `app["<plural>"].byId(<value>)`, because the app's id specifier works.
 * - `byProperty`: `app["<plural>"].whose({ "<property>": <value> })[0]`, because
 *   the declared identifier fails at run time (Calendar's
 *   `calendarIdentifier`), so the item is matched on a working property such as
 *   `name`. The property is named by the app's spelling of it.
 *
 * @param resourcePlural - The collection's accessor in the app (see
 *   `resolveCollectionAccessor`).
 * @param valueExpression - Expression holding the lookup value: the request
 *   parameter's value, never the resource's identifier property.
 */
export function buildTargetExpression(
  resource: Resource | undefined,
  resourcePlural: string,
  valueExpression: string
): string {
  return lookupInCollection(resource, member('app', resourcePlural), valueExpression)
}

/**
 * Expression addressing one child item under a parent specifier, by the
 * child resource's identifier targeting, in the same two forms as
 * {@link buildTargetExpression}:
 *
 * - `byId`: `<parentTarget>["<childPlural>"].byId(<childId>)`;
 * - `byProperty`: `<parentTarget>["<childPlural>"].whose({ "<property>": <childId> })[0]`.
 *
 * Calendar events are reachable only this way. `app.events.byId(uid)` builds a
 * specifier that fails with "no such object" when used, because events are not
 * a top-level collection; the parent-scoped form is readable, settable, and
 * deletable. A Music track is matched by its persistent ID under its playlist,
 * because its numeric id belongs to its entry in that one playlist.
 */
export function buildNestedTargetExpression(
  resource: Resource | undefined,
  parentTarget: string,
  childPlural: string,
  childIdExpression: string
): string {
  return lookupInCollection(resource, member(parentTarget, childPlural), childIdExpression)
}

/**
 * Expression addressing the item of `collection` whose identifier is
 * `valueExpression`, in the form the resource's identifier targeting selects.
 * A resource with no identifier takes the `byId` form.
 */
function lookupInCollection(
  resource: Resource | undefined,
  collection: string,
  valueExpression: string
): string {
  const lookup = identifierLookup(resource)
  if (lookup?.lookup === 'byProperty') {
    return `${collection}.whose({ ${literal(lookup.property)}: ${valueExpression} })[0]`
  }
  return `${collection}.byId(${valueExpression})`
}

/**
 * How a resource's collection finds an item from its identifier, by the
 * resource's identifier targeting, and the app's spelling of the property
 * that holds the identifier; `undefined` for a resource with no identifier.
 * Bodies ({@link lookupInCollection}) and reference conversion
 * ({@link referenceAddressing}) both take it from here, so an object a
 * reference names is the one a get of its identifier finds.
 */
function identifierLookup(
  resource: Resource | undefined
): Pick<NativeAddressing, 'lookup' | 'property'> | undefined {
  const targeting = resolveIdentifierTargeting(resource)
  if (targeting === undefined) return undefined
  return {
    lookup: targeting.strategy,
    property: nativePropertyName(resource, targeting.property),
  }
}

/**
 * How the app finds an object of `resourceKey` from the identifier a reference
 * carries, and reads that identifier back, or `undefined` when references to
 * it cannot be converted at the application.
 *
 * @remarks
 * The object is addressed as the resource's get addresses its item: in the
 * resource's collection at the application ({@link resolveCollectionAccessor}),
 * by its identifier targeting. That holds only when the get records no parent;
 * a resource whose get is parent-scoped (a Music track under its playlist, a
 * Calendar event under its calendar) is identified within its container, and
 * a reference to it needs that container (phases/13 D7, container scoping).
 * There is no addressing for such a resource, for one with no identifier, or
 * for one with no get.
 *
 * @param manifest - The validated app manifest.
 * @param resourceKey - The manifest resource key a reference names.
 */
export function referenceAddressing(
  manifest: AppManifest,
  resourceKey: string
): NativeAddressing | undefined {
  const resource = Object.hasOwn(manifest.resources, resourceKey)
    ? manifest.resources[resourceKey]
    : undefined
  const lookup = identifierLookup(resource)
  if (resource === undefined || lookup === undefined) return undefined
  const get = resolvingCommand(manifest, resourceKey, 'get')
  if (get === undefined || get[1].parent !== undefined) return undefined
  return { collection: resolveCollectionAccessor(resource), ...lookup }
}

/**
 * The parent scope of a command on a nested resource, from the parent the
 * manifest records for it (`command.parent`).
 */
interface ParentScope {
  /** The request parameter carrying the parent's identifier. */
  readonly parentIdParam: string
  /**
   * Expression addressing the parent item in its resource's collection,
   * reading its identifier from {@link PARENT_ID_LOCAL}.
   */
  readonly parentTarget: string
}

/**
 * The native "no such object" error number. Bodies raise it themselves when a
 * singular target is missing, and the executor classifies it as a missing
 * target, so a body-detected miss and an app-reported miss are one failure.
 */
export const NO_SUCH_OBJECT_ERROR_NUMBER = -1728

/**
 * Native error numbers that mean a request to the app failed, not that the
 * addressed property cannot be read: the app is not running (-600), the
 * connection to it is no longer valid (-609), it did not answer within its
 * event timeout (-1712), the user cancelled (-128), or this Mac has not
 * authorized automating it (-1743).
 *
 * A body that tolerates an unreadable property (a guarded read, or a fallback
 * from a read across a collection to per-item reads) must still fail on one of
 * these: a dead or unauthorized app is a failed operation, never a record that
 * lacks a field. The executor classifies the same numbers, so this record is
 * their one source.
 */
export const COMMUNICATION_FAILURE_ERROR_NUMBERS = Object.freeze({
  appNotRunning: -600,
  connectionInvalid: -609,
  noReply: -1712,
  userCancelled: -128,
  notAuthorized: -1743,
} as const)

/** Local that holds the parent identifier value inside a body. */
const PARENT_ID_LOCAL = 'parentId'
/** Local that holds the target item's identifier value inside a body. */
const ITEM_ID_LOCAL = 'itemId'
/** Local that holds the parent specifier inside a body. */
const PARENT_LOCAL = 'parent'

/**
 * Statement that fails the operation as "no such object" when the specifier in
 * `local` does not exist.
 *
 * A missing singular target, or a missing parent of a scoped operation, is a
 * distinct failure: never an empty result, and never an invalid selection. The
 * existence check runs before the specifier is used, and a miss raises the
 * native "no such object" number, so it is classified like any other missing
 * object. It covers identifier lookups and property matches alike. An
 * unchecked property match (`whose(...)[0]`) that matches nothing would
 * otherwise surface as an invalid index when it is first used.
 */
function failIfMissing(local: string): string {
  return [
    `if (!${local}.exists()) {`,
    "  var missing = new Error('No such object.');",
    `  missing.errorNumber = ${String(NO_SUCH_OBJECT_ERROR_NUMBER)};`,
    '  throw missing;',
    '}',
  ].join('\n')
}

/**
 * Statements binding the parent specifier of a scoped operation to
 * {@link PARENT_LOCAL}, failing as "no such object" when the parent does not
 * exist. `parentTarget` reads the parent identifier from {@link PARENT_ID_LOCAL}.
 */
function bindParent(parentTarget: string): string {
  return lines(`var ${PARENT_LOCAL} = ${parentTarget};`, failIfMissing(PARENT_LOCAL))
}

/**
 * The parent scope of a command, from the parent the manifest records for it
 * (`command.parent`), or `undefined` for a command with none, whose resource
 * is addressed at the application.
 *
 * The parent item is addressed in its resource's collection
 * ({@link resolveCollectionAccessor}), by that resource's identifier targeting
 * ({@link buildTargetExpression}), so a calendar is matched by name. Nothing
 * about the parent is inferred: not from a parameter's name or position, and
 * not from the hierarchy.
 *
 * @throws `InternalError` when the recorded parent names a resource the
 *   manifest does not declare. The manifest schema rejects such a parent, so
 *   reaching this is a macts defect.
 */
function recordedParentScope(command: Command, manifest: AppManifest): ParentScope | undefined {
  const parent = command.parent
  if (parent === undefined) return undefined
  const resource = Object.hasOwn(manifest.resources, parent.resource)
    ? manifest.resources[parent.resource]
    : undefined
  if (resource === undefined) {
    throw new InternalError(
      `Command "${command.name}" names parent resource "${parent.resource}", which its app does not declare.`,
      {}
    )
  }
  return {
    parentIdParam: parent.parameter,
    parentTarget: buildTargetExpression(
      resource,
      resolveCollectionAccessor(resource),
      PARENT_ID_LOCAL
    ),
  }
}

/**
 * Statement that reads the parent identifier of `parentScope` into
 * {@link PARENT_ID_LOCAL}, as the native value the app expects.
 */
function readParentId(command: Command, parentScope: ParentScope): string {
  return `var ${PARENT_ID_LOCAL} = ${argumentValue(
    parentScope.parentIdParam,
    findParameter(command, parentScope.parentIdParam)
  )};`
}

/** Find a declared parameter by name. */
function findParameter(command: Command, name: string): CommandParameter | undefined {
  return command.parameters.find((p) => p.name === name)
}

/**
 * Statements that bind the target item to `item` and fail as "no such object"
 * when it, or the parent it is scoped under, does not exist.
 *
 * Every get, update, and delete addresses its target this way, so a missing
 * target is reported identically whichever operation reached it.
 */
function bindTarget(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  parentScope: ParentScope | undefined,
  identifierParam: string
): string {
  const itemId = `var ${ITEM_ID_LOCAL} = ${argumentValue(identifierParam, findParameter(command, identifierParam))};`
  if (parentScope === undefined) {
    return lines(
      itemId,
      `var item = ${buildTargetExpression(resource, resourcePlural, ITEM_ID_LOCAL)};`,
      failIfMissing('item')
    )
  }
  return lines(
    readParentId(command, parentScope),
    itemId,
    bindParent(parentScope.parentTarget),
    `var item = ${buildNestedTargetExpression(resource, PARENT_LOCAL, resourcePlural, ITEM_ID_LOCAL)};`,
    failIfMissing('item')
  )
}

// ---------------------------------------------------------------------------
// Resource commands
// ---------------------------------------------------------------------------

/** A resource body and the identifier keys it addresses its target by. */
interface ResourceBody {
  readonly body: string
  readonly identifierArguments: readonly string[]
}

/**
 * Build the body of a resource-scoped command. The command's name selects the
 * pattern: `list`, `get`, `delete`, `create`, and `update` have dedicated
 * bodies; any other command is called on the app with its parameters.
 */
function buildResourceBody(
  command: Command,
  resource: Resource | undefined,
  manifest: AppManifest,
  identifierAliases: boolean,
  paged: boolean
): ResourceBody {
  const resourcePlural = resource === undefined ? 'items' : resolveCollectionAccessor(resource)
  if (paged && command.name !== 'list') {
    throw new InternalError('Only a list operation can read a page.', {})
  }
  switch (command.name) {
    case 'list':
      return buildListBody(command, resource, resourcePlural, manifest, identifierAliases, paged)
    case 'get':
      return buildGetBody(command, resource, resourcePlural, manifest)
    case 'delete':
      return buildDeleteBody(command, resource, resourcePlural, manifest)
    case 'create':
      return buildCreateBody(command, resource, resourcePlural, manifest)
    case 'update':
      return buildUpdateBody(command, resource, resourcePlural, manifest)
    default:
      return { body: buildCommandCallBody(command, true), identifierArguments: [] }
  }
}

/**
 * The identifier parameter of a get or update: the first required parameter
 * that is not the parent identifier, or `id` when the command declares none.
 * This is the request key the input schema validates, never the resource's
 * identifier property.
 */
function resolveIdentifierParam(command: Command, parentScope: ParentScope | undefined): string {
  return (
    command.parameters.find((p) => p.required && p.name !== parentScope?.parentIdParam)?.name ??
    'id'
  )
}

/** Local that holds the specifier a list body reads its items through. */
const COLLECTION_LOCAL = 'col'
/** Local that holds the whole listed collection inside a paged list body. */
const WHOLE_LOCAL = 'whole'
/** Local that holds the number of items a list body returns. */
const COUNT_LOCAL = 'count'
/** Local that holds the runtime identifier of each listed item, by index. */
const IDS_LOCAL = 'ids'
/** Local that holds the collection's length a paged list body read. */
const LENGTH_LOCAL = 'total'
/**
 * The body's third parameter: the page window of a paged list (see
 * `NativeScript.page`), `null` for every other body.
 */
const PAGE_PARAMETER = 'page'

/**
 * The native error number for an index or range a collection does not reach.
 * A paged list reads by range, so inside its read this number means the
 * collection shrank while it was read, never that the caller's request was
 * wrong.
 */
const INVALID_RANGE_ERROR_NUMBER = -1719

/**
 * The message a list fails with when its collection changed while it was
 * read, so no consistent set of reads exists.
 */
const COLLECTION_CHANGED_MESSAGE =
  'The collection changed while it was being read, so no consistent result exists.'

/**
 * Statements declaring the helpers a list body reads its items through. They
 * close over {@link COLLECTION_LOCAL} and {@link COUNT_LOCAL}, which an attempt
 * sets before it reads any property.
 *
 * - `unassemblable(message)` fails the list with a codec error: the app's
 *   reads cannot be assembled into records although the items stayed the same.
 *   The error is the codec's encode failure, the class for an app result that
 *   breaks the operation's contract, so it is reported as an unexpected value
 *   rather than as an app failure, and never as records.
 * - `collectionChanged(message)` fails the list with the collection-changed
 *   marker ({@link NATIVE_COLLECTION_CHANGED_ERROR_NAME}): the items changed
 *   while they were read, so the same request can be retried.
 * - `Inconsistent(message, changed)` is thrown, never returned, when one
 *   attempt's reads do not describe the same items. `changed` says whether the
 *   items themselves changed (the identifiers, or the count, differ between
 *   reads) or only a read disagreed with them (a read gave a number of values
 *   other than the item count). {@link listAttempts} redoes such an attempt.
 * - `aligned(what, values)` returns `values` when it is an array with one
 *   element per item, and otherwise throws a misaligned `Inconsistent`. `what`
 *   names the read in the message.
 * - `itemList()` lists the item specifiers once per attempt, on first use,
 *   checked against the item count. Only reads that fall back to one request
 *   per item need them.
 * - `communicationFailed(e)` tells whether a thrown error is one of
 *   {@link COMMUNICATION_FAILURE_ERROR_NUMBERS}: the request failed, so no
 *   guard or fallback may absorb it.
 * - `readEach(list, name, guarded)` reads one property of every item of
 *   `list`, one request per item. A guarded read the item cannot answer
 *   leaves `undefined` at its position, so the record omits that property; an
 *   unguarded failure, or a communication failure, fails the list.
 * - `readColumn(what, name)` reads one property across the items in one
 *   request. When that request fails other than by a communication failure,
 *   it falls back to `readEach` with every read guarded.
 */
function listReadHelpers(): string {
  return lines(
    'var items = null;',
    'function unassemblable(message) {',
    `  throw { name: ${literal(NATIVE_CODEC_ERROR_NAME)}, direction: "encode", path: [], message: message };`,
    '}',
    'function collectionChanged(message) {',
    `  throw { name: ${literal(NATIVE_COLLECTION_CHANGED_ERROR_NAME)}, message: message };`,
    '}',
    'function Inconsistent(message, changed) { this.message = message; this.changed = changed; }',
    '// These error numbers mean a request to the app failed (it quit, the connection broke,',
    '// it did not answer, the user cancelled, or automation is not authorized), not that a',
    '// property cannot be read, so no guard or fallback absorbs them.',
    `var communicationFailures = [${Object.values(COMMUNICATION_FAILURE_ERROR_NUMBERS).map(String).join(', ')}];`,
    'function communicationFailed(e) {',
    '  return e !== null && e !== undefined && typeof e.errorNumber === "number" &&',
    '    communicationFailures.indexOf(e.errorNumber) >= 0;',
    '}',
    'function aligned(what, values) {',
    `  if (!Array.isArray(values) || values.length !== ${COUNT_LOCAL}) {`,
    '    throw new Inconsistent("Reading " + what + " gave " + (Array.isArray(values) ? String(values.length) : "no") +',
    `      " values for " + String(${COUNT_LOCAL}) + " items, so the records cannot be assembled.", false);`,
    '  }',
    '  return values;',
    '}',
    'function itemList() {',
    `  if (items === null) { items = aligned("the items", ${COLLECTION_LOCAL}()); }`,
    '  return items;',
    '}',
    'function readEach(list, name, guarded) {',
    '  var values = [];',
    '  for (var i = 0; i < list.length; i++) {',
    '    if (guarded) {',
    '      try { values.push(list[i][name]()); } catch (e) {',
    '        if (communicationFailed(e)) { throw e; }',
    '        values.push(undefined);',
    '      }',
    '    } else {',
    '      values.push(list[i][name]());',
    '    }',
    '  }',
    '  return values;',
    '}',
    'function readColumn(what, name) {',
    '  var values;',
    `  try { values = ${COLLECTION_LOCAL}[name](); } catch (e) {`,
    '    if (communicationFailed(e)) { throw e; }',
    '    return readEach(itemList(), name, true);',
    '  }',
    '  return aligned(what, values);',
    '}'
  )
}

/**
 * Statements declaring `readIdentifiers()`, which reads the runtime
 * identifier `nativeIdName` of every item {@link COLLECTION_LOCAL} addresses,
 * in item order.
 *
 * The identifier read is never guarded. When the read across the items fails
 * other than by a communication failure (which fails the list at once), the
 * item specifiers are listed and the identifier is read once per item, still
 * unguarded, so a misconfigured identifier fails the list with a real error
 * rather than returning records with no usable id. The listed specifiers
 * become the attempt's item list.
 */
function identifierReader(nativeIdName: string): string {
  return lines(
    'function readIdentifiers() {',
    '  var values;',
    `  try { values = ${member(COLLECTION_LOCAL, nativeIdName)}(); } catch (e) {`,
    '    if (communicationFailed(e)) { throw e; }',
    `    var list = ${COLLECTION_LOCAL}();`,
    '    if (!Array.isArray(list)) { unassemblable("Listing the items gave no list, so the records cannot be assembled."); }',
    '    items = list;',
    `    return readEach(list, ${literal(nativeIdName)}, false);`,
    '  }',
    '  if (!Array.isArray(values)) { unassemblable("Reading the identifiers gave no list, so the records cannot be assembled."); }',
    '  return values;',
    '}'
  )
}

/**
 * Statements that read every property column, then judge the attempt by a
 * second read of the items' identity (`stillSame`, an expression that is true
 * when the identifiers, or the count, are unchanged).
 *
 * A column that disagrees with the item count does not end the attempt at
 * once: the identity is read again first, so the attempt reports whether the
 * items themselves changed (a changed `Inconsistent`) or only a read
 * disagreed with unchanged items (the misaligned `Inconsistent` the column
 * raised).
 */
function readColumnsThenCheck(columnReads: readonly string[], stillSame: string): string {
  return lines(
    '  var misaligned = null;',
    '  try {',
    ...columnReads.map((read) => `    ${read}`),
    '  } catch (e) {',
    '    if (!(e instanceof Inconsistent)) { throw e; }',
    '    misaligned = e;',
    '  }',
    `  if (!(${stillSame})) { throw new Inconsistent(${literal(COLLECTION_CHANGED_MESSAGE)}, true); }`,
    '  if (misaligned !== null) { throw misaligned; }'
  )
}

/** Statement declaring `sameIdentifiers(again)`: whether `again` equals the attempt's identifiers. */
function sameIdentifiersHelper(): string {
  return lines(
    'function sameIdentifiers(again) {',
    `  if (again.length !== ${COUNT_LOCAL}) { return false; }`,
    `  for (var j = 0; j < ${COUNT_LOCAL}; j++) {`,
    `    if (again[j] !== ${IDS_LOCAL}[j]) { return false; }`,
    '  }',
    '  return true;',
    '}'
  )
}

/**
 * Statements declaring `readAll()`, one attempt at reading the whole
 * collection: the item count, the identifiers, every property, then a check
 * that the collection did not change meanwhile. It throws `Inconsistent` when
 * the reads disagree.
 *
 * The item count comes from the identifier read itself when there is one: one
 * request reads every identifier, and its length is the number of items, so
 * listing costs no separate count. A resource with no identifier is counted
 * with one count request (`col.length`). Every property read is checked
 * against this count.
 *
 * A count check catches items added or removed between reads, not items that
 * swap places, which would pair values from different items. So an attempt
 * ends by reading the identifiers across the collection again, one more
 * request, and requires them equal, element by element, to the first read. A
 * resource with no identifier can only be counted again, so for it the check
 * is best effort: it catches additions and removals, not reorders.
 *
 * Each attempt starts with no item list, so an attempt that falls back to
 * per-item reads lists the items afresh rather than reusing a list from an
 * attempt that saw a different collection.
 */
function attemptReader(nativeIdName: string | undefined, columnReads: readonly string[]): string {
  if (nativeIdName === undefined) {
    return lines(
      'function readAll() {',
      '  items = null;',
      `  ${COUNT_LOCAL} = ${COLLECTION_LOCAL}.length;`,
      `  if (typeof ${COUNT_LOCAL} !== "number") { unassemblable("Counting the items gave no number, so the records cannot be assembled."); }`,
      readColumnsThenCheck(columnReads, `${COLLECTION_LOCAL}.length === ${COUNT_LOCAL}`),
      '}'
    )
  }
  return lines(
    identifierReader(nativeIdName),
    sameIdentifiersHelper(),
    'function readAll() {',
    '  items = null;',
    `  ${IDS_LOCAL} = readIdentifiers();`,
    `  ${COUNT_LOCAL} = ${IDS_LOCAL}.length;`,
    readColumnsThenCheck(columnReads, 'sameIdentifiers(readIdentifiers())'),
    '}'
  )
}

/**
 * Statements declaring `readAll()` for a paged list: one attempt at reading
 * the window {@link PAGE_PARAMETER} names, in the same native request as the
 * check that the window still continues the previous page.
 *
 * An attempt reads the collection's length, then checks the anchor: when the
 * window does not start at the first item, the item just before it must still
 * have the identifier of the last item the previous page returned. A
 * collection that no longer reaches that position, or an item there with
 * another identifier, fails the list at once as a changed collection
 * (`collectionChanged`): the anchor moved, so the window would skip or repeat
 * items, and reading again cannot help. Inserts and deletes after the anchor
 * leave it in place and are harmless; a pair of compensating moves across the
 * anchor goes undetected.
 *
 * The window is then read as a range of the collection, so every read costs
 * what the page holds, not what the collection holds: the page's identifiers,
 * each property, and the identifiers again, exactly as an unpaged attempt
 * reads the whole collection. The anchor is checked again after the reads,
 * so a move during them is detected too. The whole identifier column is
 * never read.
 *
 * `window(start, end)` is the one place the body's half-open, zero-based
 * positions become the app's range form, which is zero-based and includes its
 * end, fails rather than clamps past the last item, and gives odd ranges for
 * negative positions. Every caller passes `0 <= start < end <= length`.
 * Inside a paged read a range the collection no longer reaches means it shrank
 * meanwhile, so it is a changed `Inconsistent`, never an app failure.
 */
function pagedAttemptReader(nativeIdName: string, columnReads: readonly string[]): string {
  const offset = `${PAGE_PARAMETER}.offset`
  return lines(
    identifierReader(nativeIdName),
    sameIdentifiersHelper(),
    'function window(start, end) {',
    `  return ${WHOLE_LOCAL}.slice(start, end - 1);`,
    '}',
    'function outOfRange(e) {',
    `  return e !== null && e !== undefined && e.errorNumber === ${String(INVALID_RANGE_ERROR_NUMBER)};`,
    '}',
    'function anchorHolds() {',
    `  if (${offset} === 0) { return true; }`,
    `  if (${offset} > ${LENGTH_LOCAL}) { return false; }`,
    '  var at;',
    `  try { at = ${member(`window(${offset} - 1, ${offset})`, nativeIdName)}(); } catch (e) {`,
    '    if (outOfRange(e)) { return false; }',
    '    throw e;',
    '  }',
    `  return Array.isArray(at) && at.length === 1 && at[0] === ${PAGE_PARAMETER}.anchor;`,
    '}',
    'function readAll() {',
    '  items = null;',
    `  ${LENGTH_LOCAL} = ${WHOLE_LOCAL}.length;`,
    `  if (typeof ${LENGTH_LOCAL} !== "number") { unassemblable("Counting the items gave no number, so the records cannot be assembled."); }`,
    `  if (!anchorHolds()) { collectionChanged(${literal(COLLECTION_CHANGED_MESSAGE)}); }`,
    `  var end = Math.min(${offset} + ${PAGE_PARAMETER}.size, ${LENGTH_LOCAL});`,
    `  if (end <= ${offset}) { ${COUNT_LOCAL} = 0; ${IDS_LOCAL} = []; return; }`,
    `  ${COUNT_LOCAL} = end - ${offset};`,
    '  try {',
    `    ${COLLECTION_LOCAL} = window(${offset}, end);`,
    `    ${IDS_LOCAL} = readIdentifiers();`,
    `    if (${IDS_LOCAL}.length !== ${COUNT_LOCAL}) { throw new Inconsistent(${literal(COLLECTION_CHANGED_MESSAGE)}, true); }`,
    readColumnsThenCheck(columnReads, 'sameIdentifiers(readIdentifiers())'),
    '  } catch (e) {',
    `    if (outOfRange(e)) { throw new Inconsistent(${literal(COLLECTION_CHANGED_MESSAGE)}, true); }`,
    '    throw e;',
    '  }',
    `  if (!anchorHolds()) { collectionChanged(${literal(COLLECTION_CHANGED_MESSAGE)}); }`,
    '}'
  )
}

/**
 * Statements that run `readAll()` until one attempt is consistent, at most
 * twice, and classify a list whose two attempts both failed.
 *
 * A collection whose reads disagree during the first attempt is read again
 * from the start. When the second attempt also disagrees, the list fails,
 * rather than returning records assembled from reads of different items:
 *
 * - as a changed collection (`collectionChanged`) when either attempt saw the
 *   items themselves change (the identifiers, or for a resource without one
 *   the count, differed between its reads). The same request can be retried.
 * - as an unexpected value (`unassemblable`) when both attempts saw the same
 *   items but a read disagreed with them both times: the app answered
 *   inconsistently, so retrying will not help.
 *
 * Two transient additions and removals in a row, each undone before the
 * attempt's second identity read, leave the identity unchanged in both
 * attempts and are therefore reported as an unexpected value; that case is
 * accepted.
 */
function listAttempts(): string {
  return lines(
    'function attempt() {',
    '  try { readAll(); return null; } catch (e) {',
    '    if (e instanceof Inconsistent) { return e; }',
    '    throw e;',
    '  }',
    '}',
    'var first = attempt();',
    'if (first !== null) {',
    '  var second = attempt();',
    '  if (second !== null) {',
    '    if (first.changed || second.changed) { collectionChanged(second.changed ? second.message : first.message); }',
    '    unassemblable(second.message);',
    '  }',
    '}'
  )
}

/**
 * List the items of the resource's collection at the application, or, for a
 * command that records a parent, of the collection under the parent item.
 *
 * A paged list (`paged`) reads one window of the collection, named by the
 * body's {@link PAGE_PARAMETER} (`{ offset, size, anchor? }`, see
 * `PageWindow`), and returns `{ items, length, last? }` (see
 * `PageWindowResult`): the window's records, the collection's length when it
 * was read, and the identifier of the last record, which anchors the next
 * window (see {@link pagedAttemptReader}). Only a list that pages (see
 * `listOperationPages`: its primary identifier is claimed unique and its
 * collection is known to read ranges) can read a window. Any other list reads the whole collection and returns
 * its records as an array. Every read goes through the one specifier the body
 * binds ({@link COLLECTION_LOCAL}), so all reads cover the same items.
 *
 * Each item carries every declared property, the primary identifier (even when
 * it is declared only under `identifiers`), and a canonical `id` mirroring the
 * value sibling operations accept as the lookup. For a `byProperty` resource
 * that value is the working property (`name`), and the declared identifier key
 * is mirrored from it rather than read, because reading it fails.
 *
 * Reads go across the items: within one body, each property is read once for
 * every item in one request (`col["name"]()`), and the records are assembled
 * by index. A list therefore costs one request per property, plus one to read
 * the identifiers again (or count the items again), however many items it
 * has, and a paged list two more: the length, and the anchor (checked before
 * and after the reads). Reading every item's record one item at a time cost
 * one request per item, at seconds each in some apps (a Reminders list of 80
 * items took over four minutes), and reading the whole property record across
 * the collection in one request fails in Reminders (-1728), so each property
 * is its own request. The cost of a read across a range follows the range's
 * size, not the collection's, so a page costs what it holds.
 *
 * Index assembly is only correct while every read describes the same items in
 * the same order. Every read is checked against the item count, and the
 * identifiers are read again after the properties and must not have changed
 * (see {@link attemptReader}). A collection that changes while it is read is
 * read once more from the start, and if the second read also disagrees the
 * list fails, as a changed collection when the items changed and as an
 * unexpected value when they did not (see {@link listAttempts}): never
 * misaligned records. A missing value keeps its position in its read: the app
 * reports it as `null` there, as it does in an item's property record, so it
 * maps to the same `null` field the per-item record gave; only an `undefined`
 * position is omitted.
 *
 * A property whose read across the items fails falls back to one guarded read
 * per item, for that property alone, so one property the app cannot read
 * across the collection neither empties a record nor fails the list, and the
 * other properties stay one request each. Known cases: a Notes note's `body`
 * cannot be read across the collection (-1741) but can per item, so a notes
 * list reads it per item. A Calendar calendar's `calendarIdentifier` fails
 * both ways (-1728 across the collection, -1700 per item), but no list reads
 * it: the Calendar manifest marks it unsupported, with probe evidence, and a
 * list reads only usable properties. The fallback is detected at run time: a
 * property not yet known to fail only across the collection costs speed, and
 * one that fails both ways is omitted from its records, as it was when each
 * item's record was read. A communication failure
 * ({@link COMMUNICATION_FAILURE_ERROR_NUMBERS}) is never either: it always
 * fails the list. The runtime identifier read is never guarded (see
 * {@link identifierReader}).
 *
 * Index assembly also keeps items that share an identifier apart. A Calendar
 * calendar can hold several events with the same `uid`, and lists each as a
 * specifier by that `uid`, so a read through an item's specifier reaches the
 * first of them every time, while a read across the collection gives each
 * event its own values. The per-item fallback still reads through those
 * specifiers, so a property that failed across the collection would still
 * repeat the first event's value on every event that shares its `uid`.
 *
 * Every read uses the app's name for the property, and the collection the
 * app's name for it; every item is keyed by the public names.
 *
 * @throws `InternalError` when `paged` is set for a list that does not page
 *   (see `listOperationPages`): its items cannot be anchored reliably, or the
 *   app is not known to read a range of its collection.
 */
function buildListBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest,
  identifierAliases: boolean,
  paged: boolean
): ResourceBody {
  // The identifier is always read; every other property is read only when the
  // output record declares it (see `outputProperties`).
  const allPropNames = listReadKeys(manifest, resource)
  const targeting = resolveIdentifierTargeting(resource)
  const runtimeIdProperty = targeting?.property
  const declaredIdProperty = resolvePrimaryIdentifierProperty(resource)
  if (paged && (runtimeIdProperty === undefined || !listOperationPages(command, resource))) {
    throw new InternalError(
      'A list cannot be paged unless its primary identifier is claimed unique and its collection is known to read ranges.',
      {}
    )
  }

  // For a byProperty resource the declared identifier is exactly the property
  // whose read fails, so it is never read. With identifier aliases the working
  // value is mirrored into it; without them the field is left absent.
  const skipPropertyRead =
    targeting?.strategy === 'byProperty' &&
    declaredIdProperty !== undefined &&
    declaredIdProperty !== runtimeIdProperty
      ? declaredIdProperty
      : undefined

  const bestEffortProps = allPropNames.filter(
    (p) => p !== runtimeIdProperty && p !== skipPropertyRead
  )

  const native = (p: string): string => nativePropertyName(resource, p)
  const columnLocal = (index: number): string => `column${String(index)}`
  const columnReads = bestEffortProps.map(
    (p, index) =>
      `${columnLocal(index)} = readColumn(${literal(`the property "${p}"`)}, ${literal(native(p))});`
  )
  const recordFields = bestEffortProps.map((p, index) => {
    const value = `${columnLocal(index)}[i]`
    return `if (${value} !== undefined) { ${member('obj', p)} = ${value}; }`
  })
  const idField =
    runtimeIdProperty !== undefined ? `${member('obj', runtimeIdProperty)} = ${IDS_LOCAL}[i];` : ''
  // The canonical alias is left out when the resource has its own `id` field
  // (see resolveCanonicalIdentifierSource), so it never overwrites that field.
  const aliasSource = resolveCanonicalIdentifierSource(resource)
  const idAlias =
    identifierAliases && runtimeIdProperty !== undefined
      ? lines(
          aliasSource === undefined
            ? ''
            : `${member('obj', CANONICAL_IDENTIFIER_KEY)} = ${member('obj', aliasSource)};`,
          declaredIdProperty !== undefined && declaredIdProperty !== runtimeIdProperty
            ? `${member('obj', declaredIdProperty)} = ${member('obj', runtimeIdProperty)};`
            : ''
        )
      : ''

  // A parent that does not exist fails as "no such object", never as an empty
  // list: an empty list would claim the parent exists and has no items.
  const parentScope = recordedParentScope(command, manifest)
  let parentBinding = ''
  let collectionExpression = member('app', resourcePlural)
  if (parentScope !== undefined) {
    parentBinding = lines(readParentId(command, parentScope), bindParent(parentScope.parentTarget))
    collectionExpression = member(PARENT_LOCAL, resourcePlural)
  }

  const nativeIdName = runtimeIdProperty === undefined ? undefined : native(runtimeIdProperty)
  const pagedIdName = paged ? nativeIdName : undefined
  const body = lines(
    parentBinding,
    pagedIdName === undefined
      ? `var ${COLLECTION_LOCAL} = ${collectionExpression};`
      : lines(
          `var ${WHOLE_LOCAL} = ${collectionExpression};`,
          `var ${COLLECTION_LOCAL} = null;`,
          `var ${LENGTH_LOCAL} = 0;`
        ),
    `var ${COUNT_LOCAL} = 0;`,
    runtimeIdProperty === undefined ? '' : `var ${IDS_LOCAL};`,
    bestEffortProps.length === 0
      ? ''
      : `var ${bestEffortProps.map((_p, index) => columnLocal(index)).join(', ')};`,
    listReadHelpers(),
    pagedIdName === undefined
      ? attemptReader(nativeIdName, columnReads)
      : pagedAttemptReader(pagedIdName, columnReads),
    listAttempts(),
    'var result = [];',
    `for (var i = 0; i < ${COUNT_LOCAL}; i++) {`,
    'var obj = {};',
    ...recordFields,
    idField,
    idAlias,
    'result.push(obj);',
    '}',
    pagedIdName === undefined
      ? 'return result;'
      : lines(
          `var windowResult = { items: result, length: ${LENGTH_LOCAL} };`,
          `if (${COUNT_LOCAL} > 0) { windowResult.last = ${IDS_LOCAL}[${COUNT_LOCAL} - 1]; }`,
          'return windowResult;'
        )
  )
  return {
    body,
    identifierArguments: parentScope === undefined ? [] : [parentScope.parentIdParam],
  }
}

/**
 * Read one item's usable properties into a record keyed by their public names
 * (see {@link readOutputProperties}). A command that records a parent
 * addresses the item under the parent item; any other addresses it at the
 * application. The item must exist (see
 * {@link failIfMissing}) before any property is read.
 */
function buildGetBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest
): ResourceBody {
  const parentScope = recordedParentScope(command, manifest)
  const identifierParam = resolveIdentifierParam(command, parentScope)
  const bindItem = bindTarget(command, resource, resourcePlural, parentScope, identifierParam)
  const body = lines(bindItem, readOutputProperties(manifest, resource, 'item'), 'return obj;')
  return { body, identifierArguments: identifierArgumentsOf(parentScope, identifierParam) }
}

/**
 * Delete one item, addressed like a get. A delete command with no required
 * parameter at all (System Events' disk item delete) has no item to address and
 * is called on the app with its parameters instead.
 */
function buildDeleteBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest
): ResourceBody {
  const parentScope = recordedParentScope(command, manifest)
  const identifierParam = command.parameters.find(
    (p) => p.required && p.name !== parentScope?.parentIdParam
  )?.name
  if (identifierParam === undefined) {
    return { body: buildCommandCallBody(command, true), identifierArguments: [] }
  }
  const bindItem = bindTarget(command, resource, resourcePlural, parentScope, identifierParam)
  const body = lines(bindItem, 'item.delete();', 'return null;')
  return { body, identifierArguments: identifierArgumentsOf(parentScope, identifierParam) }
}

/**
 * Create an item from the supplied parameters and return its usable
 * properties, keyed by their public names, as a get does.
 *
 * When the command records a parent (`calendarId` names the calendar an
 * event is created in), the new item is appended to the resource's collection
 * under the parent item: `make({ at: ... })` fails with "can't make or move
 * that element into that container", and appending to the parent's collection
 * is the working form. Every other supplied parameter becomes a property of
 * the new item, keyed by the app's name for the property it names.
 */
function buildCreateBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest
): ResourceBody {
  const itemClass = member('app', resource?.name ?? 'Item')
  const parentScope = recordedParentScope(command, manifest)

  const native = (name: string): string => nativePropertyName(resource, name)
  if (parentScope !== undefined) {
    const body = lines(
      readParentId(command, parentScope),
      bindParent(parentScope.parentTarget),
      collectSuppliedParameters(
        'props',
        command.parameters.filter((p) => p.name !== parentScope.parentIdParam),
        native
      ),
      `var item = ${itemClass}(props);`,
      `${member(PARENT_LOCAL, resourcePlural)}.push(item);`,
      readOutputProperties(manifest, resource, 'item'),
      'return obj;'
    )
    return { body, identifierArguments: [parentScope.parentIdParam] }
  }

  // TODO(#81 follow-up): top-level `item.make()` has not been verified against a
  // live app and may fail the same way `make({ at: ... })` does inside a parent;
  // appending to `app["<plural>"]` is the likely working form. Verify live before
  // relying on it.
  const body = lines(
    collectSuppliedParameters('props', command.parameters, native),
    `var item = ${itemClass}(props);`,
    'item.make();',
    readOutputProperties(manifest, resource, 'item'),
    'return obj;'
  )
  return { body, identifierArguments: [] }
}

/**
 * Set the supplied writable fields on one item, addressed like a get, and
 * return its usable properties, keyed by their public names, as a get does.
 * Each field is assigned by the app's name for the property it names, and
 * each assignment is guarded, so a field the app refuses does not prevent the
 * others. The parent-scoped form matters for Calendar events:
 * `app.events.byId(uid)` is not settable, while the event addressed through
 * its calendar is.
 */
function buildUpdateBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest
): ResourceBody {
  const parentScope = recordedParentScope(command, manifest)
  const identifierParam = resolveIdentifierParam(command, parentScope)
  const excluded = new Set([identifierParam, parentScope?.parentIdParam])
  const writableFields = command.parameters.filter((p) => !excluded.has(p.name))
  const bindItem = bindTarget(command, resource, resourcePlural, parentScope, identifierParam)
  const body = lines(
    bindItem,
    ...writableFields.map(
      (p) =>
        `if (${supplied(p.name)}) { try { ${member('item', nativePropertyName(resource, p.name))} = ${argumentValue(p.name, p)}; } catch (e) {} }`
    ),
    readOutputProperties(manifest, resource, 'item'),
    'return obj;'
  )
  return { body, identifierArguments: identifierArgumentsOf(parentScope, identifierParam) }
}

// ---------------------------------------------------------------------------
// Reference resolution
// ---------------------------------------------------------------------------

/**
 * The input key under which a resolution body receives the app's object a
 * single reference names, already found by the codec.
 */
export const RESOLUTION_TARGET_ARGUMENT = 'target'

/**
 * The input key under which a resolution body receives the app's objects an
 * identity collection's entries name, already found by the codec, in entry
 * order.
 */
export const RESOLUTION_ENTRIES_ARGUMENT = 'entries'

/**
 * Build the body that reads the record, or records, a resolved reference
 * denotes.
 *
 * @remarks
 * The body never addresses the app itself. The codec decodes the reference
 * into the app's objects before the body runs, exactly as it converts a
 * reference an operation takes as input ({@link referenceAddressing}), so the
 * object a reference resolves to is the one the resource's get finds, and a
 * missing one fails before any property is read. The body then reads each
 * object with the get body's record read ({@link readOutputProperties}), so a
 * resolved record is the record a get of the same identifier returns.
 *
 * - `'one'`: the object at `args.target`, read into one record.
 * - `'many'`: each object of the list at `args.entries`, read into one record
 *   per object, in entry order.
 *
 * @param manifest - The validated manifest of the target app.
 * @param resourceKey - The manifest key of the referenced resource.
 * @param cardinality - Whether one object or a list of objects is read.
 * @throws `InternalError` when the manifest does not declare `resourceKey`.
 */
export function buildResolutionBody(
  manifest: AppManifest,
  resourceKey: string,
  cardinality: 'one' | 'many'
): string {
  const resource = Object.hasOwn(manifest.resources, resourceKey)
    ? manifest.resources[resourceKey]
    : undefined
  if (resource === undefined) {
    throw new InternalError('The reference does not match any resource of its app.', {})
  }
  if (cardinality === 'one') {
    return lines(
      `var item = ${argument(RESOLUTION_TARGET_ARGUMENT)};`,
      readOutputProperties(manifest, resource, 'item'),
      'return obj;'
    )
  }
  return lines(
    'function readRecord(item) {',
    readOutputProperties(manifest, resource, 'item'),
    'return obj;',
    '}',
    `var targets = ${argument(RESOLUTION_ENTRIES_ARGUMENT)};`,
    'var result = [];',
    'for (var i = 0; i < targets.length; i++) {',
    'result.push(readRecord(targets[i]));',
    '}',
    'return result;'
  )
}

/** The identifier keys a targeted body reads: the parent's (if any) and the item's. */
function identifierArgumentsOf(
  parentScope: ParentScope | undefined,
  identifierParam: string
): readonly string[] {
  return parentScope === undefined
    ? [identifierParam]
    : [parentScope.parentIdParam, identifierParam]
}
