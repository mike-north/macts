/**
 * Native invocation bodies: the automation-process JavaScript that carries out
 * one manifest-defined operation against a target app.
 *
 * Each body is a function body run as `(app, args)` (see `NativeScript.body`):
 * `app` is the target application and `args` is the operation's input record.
 * The bodies encode live-app behavior that the manifest alone does not express:
 *
 * - nested resources are addressed through their parent (Calendar events exist
 *   only under a calendar, never as a top-level collection);
 * - an identifier is targeted by id or by matching a working property, as the
 *   manifest's identifier targeting declares;
 * - lists read each item's whole property record in one round trip, falling
 *   back to per-field reads when that record cannot be read;
 * - a child is created inside its parent by appending it to the parent's
 *   collection;
 * - the request parameter that carries an identifier is distinct from the
 *   resource property that holds it.
 *
 * No input value is ever written into a body. Every argument is read at run
 * time as `args["<name>"]`, so the source text depends only on the manifest and
 * the operation target. Manifest-derived names (properties, collections,
 * commands, resource classes) are trusted manifest data, but they are still
 * emitted as JSON string literals in bracket form wherever the syntax allows, so
 * an unusual manifest key cannot change the meaning of the script.
 *
 * A body references only `app`, `args`, its own locals, and standard ECMAScript
 * built-ins: no host globals, no codec bindings, and no per-call state. That
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
  resolveIdentifierTargeting,
  resolveListOutputProperties,
  resolvePrimaryIdentifierProperty,
} from '../manifest/identifier.js'
import { usableProperties } from '../manifest/unsupported.js'

/**
 * Everything needed to run one operation natively, derived from the manifest
 * and the operation target alone.
 */
export interface NativeInvocationPlan {
  /** Function body run as `(app, args)`. */
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
}

/**
 * Build the native function body for one operation.
 *
 * @param manifest - The validated manifest of the target app.
 * @param target - The manifest command (and resource) to run.
 * @param options - How returned records are shaped.
 * @returns A function body run as `(app, args)`.
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
    options.identifierAliases === true
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
 */
function collectSuppliedParameters(name: string, parameters: readonly CommandParameter[]): string {
  return lines(
    `var ${name} = {};`,
    ...parameters.map(
      (p) => `if (${supplied(p.name)}) { ${member(name, p.name)} = ${argumentValue(p.name, p)}; }`
    )
  )
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

/** The parent collection a nested resource lives in. */
interface ParentCollection {
  readonly resource: Resource | undefined
  /** Lowercased plural collection name of the parent. */
  readonly plural: string
}

/**
 * Resolve the parent collection an identifier parameter refers to.
 *
 * A parameter such as `calendarId` refers to the resource whose primary
 * identifier property starts with `calendar`, or whose name or plural is
 * `calendar`/`calendars`. With no matching resource, the plural is derived from
 * the parameter name itself (`calendarId` gives `calendars`).
 */
function resolveParentCollection(manifest: AppManifest, parentIdParam: string): ParentCollection {
  const paramBase = parentIdParam.endsWith('Id')
    ? parentIdParam.slice(0, -2).toLowerCase()
    : parentIdParam.toLowerCase()
  for (const res of Object.values(manifest.resources)) {
    const primaryId = resolvePrimaryIdentifierProperty(res)
    const resNameLower = res.name.toLowerCase()
    const resPluralLower = res.plural.toLowerCase()
    if (
      primaryId?.toLowerCase().startsWith(paramBase) === true ||
      resNameLower === paramBase ||
      resPluralLower === paramBase + 's' ||
      resPluralLower === paramBase
    ) {
      return { resource: res, plural: resPluralLower }
    }
  }
  return { resource: undefined, plural: `${paramBase}s` }
}

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
 *   `name`.
 *
 * @param valueExpression - Expression holding the lookup value: the request
 *   parameter's value, never the resource's identifier property.
 */
export function buildTargetExpression(
  resource: Resource | undefined,
  resourcePlural: string,
  valueExpression: string
): string {
  const collection = member('app', resourcePlural)
  const targeting = resolveIdentifierTargeting(resource)
  if (targeting?.strategy === 'byProperty') {
    return `${collection}.whose({ ${literal(targeting.property)}: ${valueExpression} })[0]`
  }
  return `${collection}.byId(${valueExpression})`
}

/**
 * Expression addressing one child item under a parent specifier:
 * `<parentTarget>["<childPlural>"].byId(<childId>)`.
 *
 * Calendar events are reachable only this way. `app.events.byId(uid)` builds a
 * specifier that fails with "no such object" when used, because events are not
 * a top-level collection; the parent-scoped form is readable, settable, and
 * deletable.
 */
export function buildNestedTargetExpression(
  parentTarget: string,
  childPlural: string,
  childIdExpression: string
): string {
  return `${member(parentTarget, childPlural)}.byId(${childIdExpression})`
}

/** Parent scope of a get, update, or delete on a nested resource. */
interface ParentScope {
  /** The request parameter carrying the parent's identifier. */
  readonly parentIdParam: string
  /** Expression addressing the parent, reading its identifier from `parentId`. */
  readonly parentTarget: string
}

/**
 * The native "no such object" error number. Bodies raise it themselves when a
 * singular target is missing, and the executor classifies it as a missing
 * target, so a body-detected miss and an app-reported miss are one failure.
 */
export const NO_SUCH_OBJECT_ERROR_NUMBER = -1728

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
 * Resolve the parent scope of a get, update, or delete on a nested resource.
 *
 * A parent scope exists only when the command has at least two required
 * parameters: the first is the parent identifier and a later one is the child
 * identifier. A command with a single required parameter addresses a flat,
 * top-level resource. The parent is targeted honoring its own identifier
 * targeting, so a calendar is matched by name.
 */
function resolveParentScope(command: Command, manifest: AppManifest): ParentScope | undefined {
  const requiredParams = command.parameters.filter((p) => p.required)
  if (requiredParams.length < 2) return undefined
  const parentParam = requiredParams[0]
  if (parentParam === undefined) return undefined
  const parent = resolveParentCollection(manifest, parentParam.name)
  return {
    parentIdParam: parentParam.name,
    parentTarget: buildTargetExpression(parent.resource, parent.plural, PARENT_ID_LOCAL),
  }
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
    `var ${PARENT_ID_LOCAL} = ${argumentValue(
      parentScope.parentIdParam,
      findParameter(command, parentScope.parentIdParam)
    )};`,
    itemId,
    bindParent(parentScope.parentTarget),
    `var item = ${buildNestedTargetExpression(PARENT_LOCAL, resourcePlural, ITEM_ID_LOCAL)};`,
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
  identifierAliases: boolean
): ResourceBody {
  const resourcePlural = resource?.plural.toLowerCase() ?? 'items'
  switch (command.name) {
    case 'list':
      return buildListBody(command, resource, resourcePlural, manifest, identifierAliases)
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

/**
 * List every item of a collection, or of the parent's collection when the
 * command carries a required parent identifier.
 *
 * Each item carries every declared property, the primary identifier (even when
 * it is declared only under `identifiers`), and a canonical `id` mirroring the
 * value sibling operations accept as the lookup. For a `byProperty` resource
 * that value is the working property (`name`), and the declared identifier key
 * is mirrored from it rather than read, because reading it fails.
 *
 * Reads are batched: one `properties()` call per item, so a list costs about
 * one round trip per item rather than one per item per property, which made
 * long lists exceed the time limit. When an item's `properties()` fails (a
 * Calendar calendar's record includes the failing `calendarIdentifier`), the
 * item falls back to per-field reads, each guarded so one failing field cannot
 * empty the item.
 *
 * The runtime identifier read is never guarded, in either path: a misconfigured
 * identifier must fail the list with a real error rather than return items with
 * no usable id.
 */
function buildListBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest,
  identifierAliases: boolean
): ResourceBody {
  const allPropNames = resolveListOutputProperties(resource)
  const targeting = resolveIdentifierTargeting(resource)
  const runtimeIdProperty = targeting?.property
  const declaredIdProperty = resolvePrimaryIdentifierProperty(resource)

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

  const fastPathPropReads = bestEffortProps.map(
    (p) =>
      `if (${member('props', p)} !== undefined) { ${member('obj', p)} = ${member('props', p)}; }`
  )
  const fallbackPropReads = bestEffortProps.map(
    (p) => `try { ${member('obj', p)} = ${member('item', p)}(); } catch (e) {}`
  )
  const idReadFast =
    runtimeIdProperty !== undefined
      ? `${member('obj', runtimeIdProperty)} = ${member('props', runtimeIdProperty)};`
      : ''
  const idReadFallback =
    runtimeIdProperty !== undefined
      ? `${member('obj', runtimeIdProperty)} = ${member('item', runtimeIdProperty)}();`
      : ''
  const idAlias =
    identifierAliases && runtimeIdProperty !== undefined
      ? lines(
          `${member('obj', CANONICAL_IDENTIFIER_KEY)} = ${member('obj', runtimeIdProperty)};`,
          declaredIdProperty !== undefined && declaredIdProperty !== runtimeIdProperty
            ? `${member('obj', declaredIdProperty)} = ${member('obj', runtimeIdProperty)};`
            : ''
        )
      : ''

  // The parent parameter of a list is the first required parameter that is not
  // one of the listed resource's own properties (`calendarId` for events).
  const parentParam = command.parameters.find(
    (p) => p.required && !Object.hasOwn(resource?.properties ?? {}, p.name)
  )
  // A parent that does not exist fails as "no such object", never as an empty
  // list: an empty list would claim the parent exists and has no items.
  let parentBinding = ''
  let collectionExpression = `${member('app', resourcePlural)}()`
  if (parentParam !== undefined) {
    const parent = resolveParentCollection(manifest, parentParam.name)
    parentBinding = lines(
      `var ${PARENT_ID_LOCAL} = ${argumentValue(parentParam.name, parentParam)};`,
      bindParent(buildTargetExpression(parent.resource, parent.plural, PARENT_ID_LOCAL))
    )
    collectionExpression = `${member(PARENT_LOCAL, resourcePlural)}()`
  }

  const body = lines(
    parentBinding,
    `var items = ${collectionExpression};`,
    'var result = [];',
    'for (var i = 0; i < items.length; i++) {',
    'var item = items[i];',
    'var obj = {};',
    'try {',
    'var props = item.properties();',
    ...fastPathPropReads,
    idReadFast,
    '} catch (e) {',
    ...fallbackPropReads,
    idReadFallback,
    '}',
    idAlias,
    'result.push(obj);',
    '}',
    'return result;'
  )
  return {
    body,
    identifierArguments: parentParam === undefined ? [] : [parentParam.name],
  }
}

/**
 * Read one item's usable properties: those declared and not marked
 * unsupported, since reading a property the app cannot provide only costs a
 * failed round trip. A nested resource is addressed through its parent; a
 * top-level one directly. The item must exist (see {@link failIfMissing});
 * each property read is then guarded, so a property the item cannot report is
 * omitted.
 */
function buildGetBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest
): ResourceBody {
  const parentScope = resolveParentScope(command, manifest)
  const identifierParam = resolveIdentifierParam(command, parentScope)
  const propNames =
    resource === undefined ? ['name'] : usableProperties(resource).map(([name]) => name)
  const bindItem = bindTarget(command, resource, resourcePlural, parentScope, identifierParam)
  const body = lines(
    bindItem,
    'var obj = {};',
    ...propNames.map((p) => `try { ${member('obj', p)} = ${member('item', p)}(); } catch (e) {}`),
    'return obj;'
  )
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
  const parentScope = resolveParentScope(command, manifest)
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
 * Create an item from the supplied parameters and return its properties.
 *
 * When the command has a required parent identifier (the first required
 * parameter that is not one of the resource's own properties, such as
 * `calendarId`), the new item is appended to the parent's collection:
 * `make({ at: ... })` fails with "can't make or move that element into that
 * container", and appending to the parent's collection is the working form.
 * Every other supplied parameter becomes a property of the new item.
 */
function buildCreateBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest
): ResourceBody {
  const itemClass = member('app', resource?.name ?? 'Item')
  const parentParam = command.parameters.find(
    (p) => p.required && !Object.hasOwn(resource?.properties ?? {}, p.name)
  )

  if (parentParam !== undefined) {
    const parent = resolveParentCollection(manifest, parentParam.name)
    const parentTarget = buildTargetExpression(parent.resource, parent.plural, PARENT_ID_LOCAL)
    const body = lines(
      `var ${PARENT_ID_LOCAL} = ${argumentValue(parentParam.name, parentParam)};`,
      bindParent(parentTarget),
      collectSuppliedParameters(
        'props',
        command.parameters.filter((p) => p.name !== parentParam.name)
      ),
      `var item = ${itemClass}(props);`,
      `${member(PARENT_LOCAL, resourcePlural)}.push(item);`,
      'return item.properties();'
    )
    return { body, identifierArguments: [parentParam.name] }
  }

  // TODO(#81 follow-up): top-level `item.make()` has not been verified against a
  // live app and may fail the same way `make({ at: ... })` does inside a parent;
  // appending to `app["<plural>"]` is the likely working form. Verify live before
  // relying on it.
  const body = lines(
    collectSuppliedParameters('props', command.parameters),
    `var item = ${itemClass}(props);`,
    'item.make();',
    'return item.properties();'
  )
  return { body, identifierArguments: [] }
}

/**
 * Set the supplied writable fields on one item, addressed like a get, and
 * return its properties. Each assignment is guarded, so a field the app refuses
 * does not prevent the others. The parent-scoped form matters for Calendar
 * events: `app.events.byId(uid)` is not settable, while the event addressed
 * through its calendar is.
 */
function buildUpdateBody(
  command: Command,
  resource: Resource | undefined,
  resourcePlural: string,
  manifest: AppManifest
): ResourceBody {
  const parentScope = resolveParentScope(command, manifest)
  const identifierParam = resolveIdentifierParam(command, parentScope)
  const excluded = new Set([identifierParam, parentScope?.parentIdParam])
  const writableFields = command.parameters.filter((p) => !excluded.has(p.name))
  const bindItem = bindTarget(command, resource, resourcePlural, parentScope, identifierParam)
  const body = lines(
    bindItem,
    ...writableFields.map(
      (p) =>
        `if (${supplied(p.name)}) { try { ${member('item', p.name)} = ${argumentValue(p.name, p)}; } catch (e) {} }`
    ),
    'return item.properties();'
  )
  return { body, identifierArguments: identifierArgumentsOf(parentScope, identifierParam) }
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
