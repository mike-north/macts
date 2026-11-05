/**
 * Client surface derivation shared by every generator that emits an app client.
 *
 * A generated app client exposes one namespace per resource that has
 * operations, standard CRUD methods (`list`, `get`, `create`, `update`,
 * `delete`) for the resource's CRUD-named commands, one method per other
 * command, and positional parameters whose names and order follow the
 * manifest. Several surfaces must agree on that shape exactly: the HTTP client
 * SDK, the transport-neutral app contract, and the CLI and MCP adapters that
 * call the client. This module is the single place that decides it.
 *
 * Everything here is pure and returns data (commands, parameters, names), never
 * code text, so each generator renders the same decisions in its own syntax.
 *
 * @packageDocumentation
 */

import type { AppManifest, Command, CommandParameter, Resource } from '../manifest/index.js'
import {
  itemIdentifierParameter,
  selectsOneItem,
  sendsNoItem,
  unselectableItemCommands,
} from '../manifest/item-selection.js'
import { untargetedIdentifiers } from '../manifest/identifier-targeting.js'
import { resolveIdentifierTargeting } from '../manifest/identifier.js'
import { resolvePrimaryIdentifier } from '../manifest/primary-identifier.js'
import { normalizeResourceRouteSegment } from '../manifest/route.js'
import { splitIdentifierWords } from '../manifest/lower-camel.js'
import {
  isUnsupportedResourceKey,
  usableCommands,
  usableProperties,
} from '../manifest/unsupported.js'
import {
  CRUD_OPERATIONS,
  findCrudCommand,
  resourceCommandEntries,
  type CrudOperation,
} from '../manifest/resource-commands.js'
import type { DeclaredType } from '../manifest/value-shapes.js'

// Which commands apply to a resource and which backs each CRUD shape are
// manifest knowledge (../manifest/resource-commands.ts). They are re-exported
// here because every client surface derives its methods from them.
export {
  CRUD_OPERATIONS,
  commandAppliesToResource,
  findCrudCommand,
  resourceCommandEntries,
  type CrudOperation,
} from '../manifest/resource-commands.js'

/**
 * Words that cannot name a JavaScript binding or method without escaping.
 */
const RESERVED_WORDS: ReadonlySet<string> = new Set([
  'arguments',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'of',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

/**
 * The binding or method name a generated client uses for a manifest name: the
 * name itself, or the name prefixed with `_` when it is a reserved word (a
 * command named `delete` becomes the method `_delete`).
 */
export function safeIdentifier(name: string): string {
  return RESERVED_WORDS.has(name) ? `_${name}` : name
}

/** Whether a command `name` is one of the standard CRUD shapes. */
export function isCrudName(name: string): name is CrudOperation {
  return (CRUD_OPERATIONS as readonly string[]).includes(name)
}

/**
 * The application-scoped commands, as `[commandKey, command]` pairs in manifest
 * declaration order, except those marked unsupported. They become methods on
 * the client root.
 */
export function appCommandEntries(manifest: AppManifest): [string, Command][] {
  return usableCommands(manifest).filter(([, cmd]) => cmd.scope === 'application')
}

/**
 * Whether a resource has at least one operation (CRUD or custom command).
 * Resources without operations get no client namespace: there is nothing to
 * call, and an empty namespace would be dead API surface. A resource marked
 * unsupported has none.
 */
export function resourceHasOperations(manifest: AppManifest, resourceName: string): boolean {
  return resourceCommandEntries(manifest, resourceName).length > 0
}

/**
 * The client namespace under which a resource's methods appear (for example
 * `client.calendars`, `client.mediaItems`): the resource's segment, the same
 * spelling as its routes, tools and derived permissions
 * ({@link normalizeResourceRouteSegment}).
 */
export function resourceNamespace(resource: Pick<Resource, 'plural'>): string {
  return normalizeResourceRouteSegment(resource.plural)
}

/**
 * An identifier as words for generated prose, such as a resource's plural or
 * name in a method's documentation: `MediaItems` → `media items`,
 * `AIMHandles` → `AIM handles`, `URLTrack` → `URL track`. The words are the
 * shared split ({@link splitIdentifierWords}); acronyms keep their capitals
 * and every other word is lowercased. It is prose only, never a name a caller
 * types.
 *
 * @param identifier - A Pascal or camel case identifier.
 * @returns The identifier's words, separated by single spaces.
 */
export function identifierWords(identifier: string): string {
  return splitIdentifierWords(identifier)
    .map((word) => (/^[A-Z]{2,}/.test(word) ? word : word.toLowerCase()))
    .join(' ')
}

/**
 * The sentence a generated get, update or delete doc adds about items that
 * share the value the operation looks its item up by, or `undefined` when
 * none can.
 *
 * A resource whose primary identifier is matched with `byProperty` is found
 * as the first match of `whose` in the app's element order (phases/13 D10,
 * identifier targeting). With no uniqueness claim (`unique` absent or
 * false), several items can share the value, and the operation acts on the
 * first of them rather than failing as ambiguous. An identifier claimed
 * unique, or looked up by the app's id or key specifier or as a root, matches
 * no property, so it gets no sentence.
 *
 * @param resource - The resource the operation acts on.
 * @returns One sentence, naming the resource's plural and the matched
 *   property in prose.
 */
export function firstMatchNote(resource: Resource | undefined): string | undefined {
  const targeting = resolveIdentifierTargeting(resource)
  if (resource === undefined || targeting?.strategy !== 'byProperty') return undefined
  if (resolvePrimaryIdentifier(resource)?.unique === true) return undefined
  return `When several ${identifierWords(resource.plural)} share the same ${identifierWords(targeting.property)}, the first match in the app's order is used, and the operation does not fail as ambiguous.`
}

/**
 * The sentence a generated resource command's doc adds when the command
 * sends the app no item, or `undefined` when it sends one.
 *
 * Such a command is a known gap (`KNOWN_ITEM_SELECTION_GAPS`): it acts on one
 * item, but the manifest cannot yet select it, so it is called on the app
 * with its declared parameters alone and the app picks what it acts on.
 * Generation refuses any other command that declares no item, so only a
 * known gap ever gets the sentence.
 *
 * @param command - The resource command.
 * @param resource - The resource the command acts on.
 * @returns One sentence, naming the resource's item in prose.
 */
export function itemNotSentNote(command: Command, resource: Resource): string | undefined {
  if (!sendsNoItem(command)) return undefined
  return `macts does not yet send the ${identifierWords(resource.name)} to the app, so the app acts on whatever it chooses.`
}

/**
 * The sentence a generated doc adds about the item a resource command acts
 * on: that macts does not yet send it ({@link itemNotSentNote}), or else
 * that the first match is used ({@link firstMatchNote}); `undefined` when
 * neither applies.
 */
export function resourceCommandNote(command: Command, resource: Resource): string | undefined {
  return itemNotSentNote(command, resource) ?? firstMatchNote(resource)
}

/**
 * A noun phrase with its indefinite article, for generated prose: `a note`,
 * `an event`, `an AIM handle`. The article follows the noun's first letter.
 *
 * @param noun - The noun phrase, such as {@link identifierWords} produces.
 * @returns The phrase prefixed with `a` or `an`.
 */
export function withArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`
}

/**
 * The backing `create` command of a resource, if any: the command whose
 * parameters, together with the writable properties, form the create input.
 */
export function findResourceCreateCommand(
  manifest: AppManifest,
  resourceName: string
): Command | undefined {
  return findCrudCommand(resourceCommandEntries(manifest, resourceName), 'create')?.[1]
}

/**
 * The errors that refuse generating anything from a manifest, each naming the
 * app and saying what to declare:
 *
 * - one per command that must select one item and declares no identifier
 *   parameter to select it by (`unselectableItemCommands`), naming the
 *   command key;
 * - one per resource whose primary identifier declares no targeting and is
 *   not the class's dictionary id, code `ID  ` (`untargetedIdentifiers`),
 *   naming the resource and the identifier property.
 *
 * Every package and SDK generator checks this before it builds any file and
 * returns these errors with no files, and `generateCapabilitiesModule` throws
 * them, so no generated interface takes an identifier the manifest does not
 * declare, and no surface looks an item up by an id specifier that cannot
 * find it. Registration refuses the same manifests by the same rules.
 */
export function generationRefusals(manifest: AppManifest): string[] {
  const refused = `App "${manifest.app.name}" cannot be generated from its manifest`
  return [
    ...unselectableItemCommands(manifest).map(({ problem }) => `${refused}: ${problem}`),
    ...untargetedIdentifiers(manifest).map(({ problem }) => `${refused}: ${problem}`),
  ]
}

/**
 * The request parameter names that identify the target of a resource-scoped
 * command that acts on one item: a get, update or delete, or any other
 * resource command but a list or create (`selectsOneItem`).
 *
 * A command on a nested resource records its parent (`command.parent`), and
 * the parent scope is the parameter it names (`calendarId` on `getEvent`).
 * The child identifier is the parameter `itemIdentifierParameter` selects:
 * the first other required parameter (`id`). A command that records no parent
 * has no parent scope, whatever its parameters are named or however many are
 * required: nothing about the parent is inferred.
 *
 * The names are exactly the `command.parameters` entries the server validates
 * and binds, so every surface sends them under these names. No name is
 * supplied for a command that declares none.
 *
 * @throws `Error` naming the command when it declares no identifier
 *   parameter. Generation refuses such a manifest before any surface asks
 *   (`unselectableItemCommands`), so reaching this is a generator defect.
 */
export function resolveIdParams(command: Command): {
  parentParam: string | undefined
  childParam: string
} {
  const parentParam = command.parent?.parameter
  const child = itemIdentifierParameter(command)
  if (child === undefined) {
    const besideParent =
      parentParam === undefined ? '' : ` other than its parent parameter "${parentParam}"`
    throw new Error(
      `${describeCommand(command)} declares no identifier parameter${besideParent}, so no item can be selected.`
    )
  }
  return { parentParam, childParam: child.name }
}

/** A command in error prose: `The get command of Event`. */
function describeCommand(command: Command): string {
  const resources =
    command.resourceType === undefined
      ? ''
      : ` of ${Array.isArray(command.resourceType) ? command.resourceType.join(', ') : command.resourceType}`
  return `The ${command.name} command${resources}`
}

/**
 * The parameters a `list` method takes positionally: the command's required
 * parameters (typically a parent scope such as `windowId`), in declaration
 * order. Optional list parameters are not part of the method signature.
 */
export function listMethodParameters(command: Command): CommandParameter[] {
  return command.parameters.filter((p) => p.required)
}

/** One positional parameter of a generated method. */
export interface SignatureParameter {
  /** The manifest parameter. */
  readonly parameter: CommandParameter
  /** The binding name used in the method signature. */
  readonly bindingName: string
  /** Whether the argument may be omitted. */
  readonly optional: boolean
}

/** One field of a generated request body. */
export interface BodyField {
  /** The request field name, exactly the manifest parameter name. */
  readonly fieldName: string
  /** The method binding that supplies the value. */
  readonly bindingName: string
}

/**
 * The positional signature and request body of a command method (an app
 * command, or a resource command that is not a CRUD shape).
 *
 * A resource command acts on one item, so its signature starts as a get's
 * does: the parent's identifier parameter, when the command records a
 * parent, then the item's ({@link resolveIdParams}). The other parameters
 * follow, required first, then optional ones, each in declaration order, with
 * reserved words escaped; an app command has only those, and so has a known
 * gap, which declares no item ({@link itemNotSentNote}). The body forwards
 * every parameter under its manifest name, in declaration order, so the
 * server validates it.
 */
export function commandMethodParameters(command: Command): {
  signature: SignatureParameter[]
  body: BodyField[]
} {
  const item =
    command.scope === 'resource' && selectsOneItem(command)
      ? itemIdentifierParameter(command)
      : undefined
  const parent =
    item === undefined
      ? undefined
      : command.parameters.find((p) => p.name === command.parent?.parameter)
  const leading = [parent, item].filter((p): p is Command['parameters'][number] => p !== undefined)
  const rest = command.parameters
    .filter((p) => !leading.includes(p))
    .sort((a, b) => {
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      return 0
    })
  const signature = [...leading, ...rest].map((parameter) => ({
    parameter,
    bindingName: safeIdentifier(parameter.name),
    optional: !parameter.required,
  }))
  const body = command.parameters.map((parameter) => ({
    fieldName: parameter.name,
    bindingName: safeIdentifier(parameter.name),
  }))
  return { signature, body }
}

// How a manifest declares a type is manifest knowledge
// (../manifest/value-shapes.ts).
export type { DeclaredType }

/** One field of a resource's create input. */
export interface CreateInputField {
  /** The field's declared type. */
  readonly type: DeclaredType
  /** Whether the field must be supplied. */
  readonly required: boolean
  /** Text describing the field. */
  readonly description: string
  /** Whether the field comes from a property or a create-command parameter. */
  readonly source: 'property' | 'parameter'
}

/**
 * The fields of a resource's create input, keyed by request field name, in
 * order: the resource's writable usable properties (all optional; a property
 * marked unsupported is never an input), then the backing create command's
 * parameters.
 *
 * Command parameters are what the server validates, so a parameter overrides a
 * writable property of the same name, and identifier parameters that are not
 * properties (an Event's `calendarId`) are part of the input; without them a
 * create call could not send the identifier the server requires. A resource
 * marked unsupported has no create input.
 */
export function createInputFields(
  manifest: AppManifest,
  resourceName: string
): Map<string, CreateInputField> {
  const fields = new Map<string, CreateInputField>()
  if (isUnsupportedResourceKey(manifest, resourceName)) return fields
  const resource = manifest.resources[resourceName]
  if (resource !== undefined) {
    for (const [propName, prop] of usableProperties(resource)) {
      if (prop.access !== 'rw') continue
      fields.set(propName, {
        type: prop.type,
        required: false,
        description: prop.description,
        source: 'property',
      })
    }
  }
  const createCommand = findResourceCreateCommand(manifest, resourceName)
  if (createCommand) {
    for (const param of createCommand.parameters) {
      fields.set(param.name, {
        type: param.type,
        required: param.required,
        description: param.description,
        source: 'parameter',
      })
    }
  }
  return fields
}
