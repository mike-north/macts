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

import type { ReferenceCardinality } from '@macts/contracts'
import type { AppManifest, Command, CommandParameter, Resource } from '../manifest/index.js'
import { normalizeResourceRouteSegment } from '../manifest/route.js'
import { splitIdentifierWords } from '../manifest/lower-camel.js'
import {
  isUnsupportedResourceKey,
  usableCommands,
  usableProperties,
} from '../manifest/unsupported.js'
import type { PropertyType } from '../manifest/schemas/property.js'

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

/**
 * The standard CRUD shapes. A resource command's `name` says which shape (if
 * any) it fulfils; its key in `manifest.commands` is what addresses its route.
 */
export const CRUD_OPERATIONS = ['list', 'get', 'create', 'update', 'delete'] as const

/** One of the standard CRUD shapes. */
export type CrudOperation = (typeof CRUD_OPERATIONS)[number]

/** Whether a command `name` is one of the standard CRUD shapes. */
export function isCrudName(name: string): name is CrudOperation {
  return (CRUD_OPERATIONS as readonly string[]).includes(name)
}

/**
 * Whether a resource-scoped command applies to a resource: it names the
 * resource in `resourceType`, or omits `resourceType` and so applies to every
 * resource. This is the same rule the route derivation uses, so every client
 * method has a route.
 */
export function commandAppliesToResource(cmd: Command, resourceName: string): boolean {
  if (cmd.scope !== 'resource') return false
  if (cmd.resourceType === undefined) return true
  if (Array.isArray(cmd.resourceType)) return cmd.resourceType.includes(resourceName)
  return cmd.resourceType === resourceName
}

/**
 * The commands that apply to a resource, as `[commandKey, command]` pairs in
 * manifest declaration order. None apply to a resource marked unsupported,
 * which has no routes, and none is marked unsupported itself.
 */
export function resourceCommandEntries(
  manifest: AppManifest,
  resourceName: string
): [string, Command][] {
  if (isUnsupportedResourceKey(manifest, resourceName)) return []
  return usableCommands(manifest).filter(([, cmd]) => commandAppliesToResource(cmd, resourceName))
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
 * The backing command for a CRUD shape among a resource's commands: the first,
 * in declaration order, whose `name` is `operation`. Returns `undefined` when
 * the manifest declares no such command, so the client has no such method.
 * Later commands with the same CRUD name still have routes, but no client
 * method.
 */
export function findCrudCommand(
  resourceCommands: readonly [string, Command][],
  operation: CrudOperation
): [string, Command] | undefined {
  return resourceCommands.find(([, cmd]) => cmd.name === operation)
}

/**
 * The manifest command that resolves references to a resource: the backing
 * `get` command ({@link findCrudCommand}) for a single reference, the backing
 * `list` command for a collection reference.
 *
 * @remarks
 * This is the rule by which a generated contract's resource table names its
 * `get` and `list` operations, and by which the runtime chooses the operation
 * a reference resolves as. The choice is structural: a resource command's
 * `name` declares the CRUD shape it fulfils, and the first applicable command
 * of that shape, in declaration order, is the one. A resource marked
 * unsupported has no commands, so nothing resolves references to it.
 *
 * @param manifest - A validated app manifest.
 * @param resourceKey - The manifest resource key the reference names.
 * @param cardinality - `'one'` for a single reference, `'many'` for a
 *   collection reference.
 * @returns The command's key and definition, or `undefined` when the resource
 *   has no command of that shape.
 */
export function referenceResolutionCommand(
  manifest: AppManifest,
  resourceKey: string,
  cardinality: ReferenceCardinality
): [string, Command] | undefined {
  return findCrudCommand(
    resourceCommandEntries(manifest, resourceKey),
    cardinality === 'one' ? 'get' : 'list'
  )
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
 * The request parameter names that identify the target of a get, update, or
 * delete command.
 *
 * Some commands take two required identifiers: a parent scope (for example
 * `calendarId` on `getEvent`) and the child identifier (`id`). The parent scope
 * is the first required parameter and the child identifier the last. With one
 * required parameter it is the child identifier and there is no parent scope;
 * with none, the child identifier is `id`.
 *
 * The names are exactly the `command.parameters` entries the server validates
 * and binds, so every surface sends them under these names.
 */
export function resolveIdParams(command: Command): {
  parentParam: string | undefined
  childParam: string
} {
  const requiredParams = command.parameters.filter((p) => p.required)
  if (requiredParams.length >= 2) {
    const parentParam = requiredParams[0]?.name
    const childParam = requiredParams[requiredParams.length - 1]?.name ?? 'id'
    return { parentParam, childParam }
  }
  return { parentParam: undefined, childParam: requiredParams[0]?.name ?? 'id' }
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
 * The signature lists required parameters first, then optional ones, each in
 * declaration order, with reserved words escaped. The body forwards every
 * parameter under its manifest name, in declaration order, so the server
 * validates it.
 */
export function commandMethodParameters(command: Command): {
  signature: SignatureParameter[]
  body: BodyField[]
} {
  const sortedParams = [...command.parameters].sort((a, b) => {
    if (a.required && !b.required) return -1
    if (!a.required && b.required) return 1
    return 0
  })
  const signature = sortedParams.map((parameter) => ({
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

/**
 * A type as a manifest declares it: a property type (absent means the
 * property has no declared type), or a command parameter type (a type name or
 * a flat reference record such as `{ resource: 'Calendar' }`).
 */
export type DeclaredType = CommandParameter['type'] | Exclude<PropertyType, string> | undefined

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
