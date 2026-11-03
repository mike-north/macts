/**
 * Generator for an app's transport-neutral contract (`@macts/<app>/contract`).
 *
 * The contract is the single description of an app that every client and
 * runtime shares. It declares the SDK types callers see (records, create and
 * update inputs, enums, and the client interface), one operation descriptor
 * per route (identity, required permission, manifest target, and input and
 * output value types), the resource table that references resolve against,
 * a lazy loader for the manifest, and a `bind` function that turns a
 * factory-supplied `ClientRuntime` into the app's client. It performs no I/O
 * and imports only `@macts/contracts`, so it loads on any platform; clients
 * come from the local and remote factories, never from the contract itself.
 *
 * Two modules are emitted: `src/contract/index.ts` (the contract) and
 * `src/contract/manifest.ts` (the manifest as data, imported only by
 * `loadManifest`).
 *
 * The client surface (namespaces, method names, positional parameters) follows
 * the shared derivation in `../surface.ts`, the same one the HTTP client SDK
 * uses, so the two clients have the same shape.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import {
  PAGING_INPUT_NAMES,
  ValueTypes as t,
  type RecordField,
  type ReferenceRegistry,
  type ValueType,
} from '@macts/contracts'
import type {
  AppManifest,
  Command,
  CommandParameter,
  NullabilityEvidence,
  NullabilityResolution,
  Property,
  Resource,
} from '../../manifest/index.js'
import {
  ignoredIdentifierNullability,
  normalizeAppRouteSegment,
  resolveManifestRoutes,
  resolveParameterNullability,
  resolvePrimaryIdentifierProperty,
  resolveReadNullability,
  resolveResettability,
  type ManifestRoute,
} from '../../manifest/index.js'
import { lowerCamel } from '../../manifest/lower-camel.js'
import { manifestGeneratedNotice } from '../generated-header.js'
import { usableCommands, usableProperties, usableResources } from '../../manifest/unsupported.js'
import {
  appCommandEntries,
  commandMethodParameters,
  createInputFields,
  findCrudCommand,
  identifierWords,
  isCrudName,
  listMethodParameters,
  resolveIdParams,
  resourceCommandEntries,
  resourceHasOperations,
  resourceNamespace,
  safeIdentifier,
  type CrudOperation,
  type DeclaredType,
} from '../surface.js'
import {
  ValueBuilder,
  ValueRenderer,
  createNameResolver,
  mapDeclaredType,
  nullableShape,
  stringLiteral,
  type ContractTypeName,
  type NameResolver,
  type ValuePosition,
  type ValueShape,
} from './value-mapping.js'

/** The package-relative path of the generated contract module. */
export const CONTRACT_MODULE_PATH = 'src/contract/index.ts'

/** The package-relative path of the generated manifest data module. */
export const CONTRACT_MANIFEST_MODULE_PATH = 'src/contract/manifest.ts'

/** What every contract diagnostic carries. */
interface ContractDiagnosticBase {
  /** The app's route segment. */
  readonly app: string
  /**
   * Where the finding is, as a manifest path, e.g.
   * `resources.FinderWindow.properties.iconViewOptions` or
   * `commands.open.parameters.target`.
   */
  readonly position: string
  /** A one-line description of the finding. */
  readonly message: string
}

/**
 * Something generation tolerated but a manifest author should fix:
 *
 * - `unresolved-type`: a manifest type names no resource or enum, so the
 *   contract describes it as `unknown`.
 * - `identifier-nullability-ignored`: the manifest claims nullability for a
 *   resource's primary identifier property. The contract keeps the identifier
 *   non-null, since a reference cannot exist without it; evidence that it is
 *   sometimes empty means the identifier choice is wrong.
 */
export type ContractDiagnostic =
  | (ContractDiagnosticBase & {
      readonly kind: 'unresolved-type'
      /** The declared type, as the manifest states it. */
      readonly type: unknown
    })
  | (ContractDiagnosticBase & {
      readonly kind: 'identifier-nullability-ignored'
      /** The ignored claim's evidence. */
      readonly evidence: NullabilityEvidence
    })

/** The generated contract modules and what generation found. */
export interface GeneratedContract {
  /** The contract and manifest modules, with package-relative paths. */
  readonly files: { path: string; content: string }[]
  /** Unresolved types, which generation tolerated as `unknown`. */
  readonly diagnostics: ContractDiagnostic[]
  /**
   * Problems that make the contract invalid (name collisions, malformed
   * permissions). A contract with errors must not be published.
   */
  readonly errors: string[]
}

/** Names derived from the app for the generated contract. */
export interface ContractNames {
  /** The app's route segment (`AppContract.app`), e.g. `google-chrome`. */
  readonly app: string
  /** The client interface, e.g. `GoogleChromeClient`. */
  readonly client: string
  /** The exported contract binding, e.g. `googleChromeContract`. */
  readonly contract: string
}

/**
 * The contract's names for an app. The client interface keeps the HTTP client
 * class's name (the app name without spaces), and the contract binding is its
 * lower camel case form.
 */
export function contractNames(manifest: AppManifest): ContractNames {
  const appName = manifest.app.name.replace(/\s+/g, '')
  return {
    app: normalizeAppRouteSegment(manifest.app.name),
    client: `${appName}Client`,
    contract: `${lowerCamel(appName)}Contract`,
  }
}

/**
 * Report every manifest type that does not resolve, once per declaration
 * site (resource properties, command parameters, and command results), and
 * every nullability claim on a primary identifier property, which the
 * contract ignores.
 */
export function collectContractDiagnostics(manifest: AppManifest): ContractDiagnostic[] {
  const app = normalizeAppRouteSegment(manifest.app.name)
  const names = createNameResolver(manifest)
  const diagnostics: ContractDiagnostic[] = []
  const check = (type: DeclaredType, position: string): void => {
    if (mapDeclaredType(type, 'output', names).resolved) return
    diagnostics.push({
      kind: 'unresolved-type',
      app,
      position,
      type,
      message: `${app}: ${position}: the type ${JSON.stringify(type)} names no resource or enum, so the contract describes it as unknown.`,
    })
  }
  for (const [resourceKey, resource] of usableResources(manifest)) {
    for (const [propName, prop] of usableProperties(resource)) {
      const position = `resources.${resourceKey}.properties.${propName}`
      check(prop.type, position)
      const evidence = ignoredIdentifierNullability(resource, propName, prop)
      if (evidence !== undefined) {
        diagnostics.push({
          kind: 'identifier-nullability-ignored',
          app,
          position,
          evidence,
          message: `${app}: ${position}: the primary identifier is never null, so its nullability claim (${evidence.source} evidence) is ignored; if the identifier can be empty, choose a different identifier.`,
        })
      }
    }
  }
  for (const [commandKey, command] of usableCommands(manifest)) {
    for (const param of command.parameters) {
      check(param.type, `commands.${commandKey}.parameters.${param.name}`)
    }
    if (command.returns !== undefined) check(command.returns, `commands.${commandKey}.returns`)
  }
  return diagnostics
}

/**
 * Generate the contract and manifest modules for an app.
 *
 * @param manifest - The validated app manifest.
 */
export function generateContract(manifest: AppManifest): GeneratedContract {
  const builder = new ContractBuilder(manifest)
  const contract = builder.build()
  return {
    files: [
      { path: CONTRACT_MODULE_PATH, content: contract },
      { path: CONTRACT_MANIFEST_MODULE_PATH, content: generateManifestModule(manifest) },
    ],
    diagnostics: collectContractDiagnostics(manifest),
    errors: builder.errors,
  }
}

/** The manifest data module, imported lazily by `loadManifest`. */
function generateManifestModule(manifest: AppManifest): string {
  const names = contractNames(manifest)
  return `/**
 * The ${manifest.app.name} manifest, as data.
 *
 * \`${names.contract}.loadManifest()\` imports this module lazily. Only the
 * Mac-side runtime calls it, and it validates the manifest before use, so the
 * value is deliberately typed \`unknown\`. Remote clients never load this module.
 *
 * ${manifestGeneratedNotice(manifest.app.name)}
 *
 * @packageDocumentation
 */

/** The ${manifest.app.name} manifest. */
export const manifest: unknown = ${JSON.stringify(manifest, null, 2)}
`
}

// ---------------------------------------------------------------------------
// Contract module
// ---------------------------------------------------------------------------

/** One field of a generated record type (a record, an input, or a request). */
interface FieldModel {
  readonly name: string
  /** The field's value composition, nullability included. */
  readonly shape: ValueShape
  readonly optional: boolean
  /** The manifest's description, which the value type also carries. */
  readonly description: string
  /**
   * The field's nullability and its basis, in user-facing words, for the
   * field's doc comment only (after the description).
   */
  readonly nullabilityNote?: string
}

/** How an operation's input is typed in its descriptor. */
type InputModel =
  | {
      /** The input is a named create input, shared with its value type. */
      readonly kind: 'create'
      readonly resourceKey: string
    }
  | {
      /** The input is a request record spelled out field by field. */
      readonly kind: 'fields'
      readonly fields: readonly FieldModel[]
      /**
       * The record also takes the paging inputs (`t.pageInputs()`): the input
       * of a list operation of a resource that has an identifier.
       */
      readonly paged: boolean
    }

/** What an operation returns. */
type OutputModel =
  | { readonly kind: 'none' }
  | { readonly kind: 'record'; readonly resourceKey: string }
  /** One page of a resource's records: the output of every list operation. */
  | { readonly kind: 'page'; readonly resourceKey: string }
  | { readonly kind: 'value'; readonly shape: ValueShape }

/** One operation descriptor to emit. */
interface OperationModel {
  readonly route: ManifestRoute
  readonly binding: string
  readonly input: InputModel
  readonly output: OutputModel
}

/** One client method, and the operation it invokes. */
interface MethodModel {
  readonly name: string
  readonly doc: string
  /** Positional parameters, before the trailing call options. */
  readonly params: readonly {
    readonly binding: string
    readonly type: string
    readonly optional: boolean
    /** The `@param` text, for a parameter the manifest declares. */
    readonly doc?: string
  }[]
  /** The `@returns` text, for a result that needs explaining. */
  readonly returnsDoc?: string
  readonly returnType: string
  readonly operation: OperationModel
  /** How the method builds the input record from its arguments. */
  readonly body:
    | {
        readonly kind: 'fields'
        readonly fields: readonly { readonly field: string; readonly binding: string }[]
      }
    | { readonly kind: 'input'; readonly binding: string }
    | {
        readonly kind: 'input-with-fields'
        readonly binding: string
        readonly fields: readonly { readonly field: string; readonly binding: string }[]
      }
}

/** A client namespace (one per resource with operations). */
interface NamespaceModel {
  readonly name: string
  readonly interfaceName: string
  readonly description: string
  readonly methods: readonly MethodModel[]
}

/** The `@macts/contracts` value exports the contract module uses. */
const CONTRACT_VALUE_IMPORTS = ['ValueTypes'] as const

/**
 * The `@macts/contracts` types every contract module uses; `ValueType` only
 * when the module declares a record or create input value type.
 */
const CONTRACT_BASE_TYPE_IMPORTS = [
  'AppContract',
  'CallOptions',
  'ClientRuntime',
  'OperationDescriptor',
  'ValueType',
] as const

/**
 * The shape of a capability permission: exactly three non-empty,
 * colon-separated segments, `app:resource:operation`. Governance evaluates
 * only this shape and denies any other (fail closed), so a descriptor with
 * another shape could never be allowed; every shipped manifest's permissions
 * have exactly three segments.
 */
const PERMISSION_SHAPE = /^[^:]+:[^:]+:[^:]+$/

/** Builds the text of one app's contract module. */
class ContractBuilder {
  readonly errors: string[] = []
  readonly #manifest: AppManifest
  readonly #names: ContractNames
  readonly #resolver: NameResolver
  readonly #renderer: ValueRenderer
  readonly #builder: ValueBuilder
  #registry: ReferenceRegistry | undefined
  readonly #identifiers = new Map<string, ValueShape>()
  readonly #operations: OperationModel[] = []
  readonly #operationsByRoute = new Map<string, OperationModel>()
  readonly #privateBindings = new Set<string>(['t', 'resources', 'operations', 'bind'])
  /**
   * The local names the module gives the paging types of `@macts/contracts`:
   * `Page` and `PageRequest`, or an alias when the manifest declares a type of
   * that name (an app with a `Page` resource), so paging never takes a name
   * an app needs.
   */
  readonly #pagingNames: { readonly page: string; readonly pageRequest: string }

  constructor(manifest: AppManifest) {
    this.#manifest = manifest
    this.#names = contractNames(manifest)
    this.#pagingNames = pagingTypeNames(manifest)
    this.#resolver = createNameResolver(manifest)
    for (const [resourceKey, resource] of usableResources(manifest)) {
      const identifier = this.#identifierProperty(resource)
      if (identifier !== undefined) {
        this.#identifiers.set(resourceKey, this.#map(identifier.type, 'output'))
      }
    }
    this.#renderer = new ValueRenderer({
      enumMembers: (enumKey) => `${lowerCamel(enumKey)}Members`,
      recordInterface: (resourceKey) => resourceKey,
      identifier: (resourceKey) => this.#identifiers.get(resourceKey),
      resourcesBinding: 'resources',
    })
    this.#builder = new ValueBuilder({
      enumMembers: (enumKey) => enumMembers(this.#manifest.enums[enumKey]?.values ?? []),
      registry: () => (this.#registry ??= this.#buildRegistry()),
    })
  }

  /**
   * The resource table as references read it, built in process: the same
   * resources in the same order as the generated table, each with the
   * identifier value type the table renders for it.
   */
  #buildRegistry(): ReferenceRegistry {
    const registry: Record<string, { readonly id?: ValueType<unknown> }> = {}
    for (const [resourceKey, resource] of usableResources(this.#manifest)) {
      const identifier = this.#identifierProperty(resource)
      const identifierShape = this.#identifiers.get(resourceKey)
      registry[resourceKey] =
        identifier !== undefined && identifierShape !== undefined
          ? { id: this.#builder.build(identifierShape, identifier.description) }
          : {}
    }
    return registry
  }

  build(): string {
    this.#deriveOperations()
    const namespaces = this.#deriveNamespaces()
    const appMethods = appCommandEntries(this.#manifest).flatMap(([commandKey, command]) => {
      const operation = this.#operationsByRoute.get(this.#routeOf(commandKey, undefined))
      return operation === undefined ? [] : [this.#commandMethod(command, operation)]
    })

    // Sections are rendered first so the renderer has recorded every enum
    // tuple and contract type they use; the imports and tuples come last.
    const enumTypes = this.#renderEnumTypes()
    const records = this.#renderRecordInterfaces()
    const inputs = this.#renderInputInterfaces()
    const clientTypes = this.#renderClientInterfaces(namespaces, appMethods)
    const recordValues = this.#renderRecordValueTypes()
    const createValues = this.#renderCreateInputValueTypes()
    const resourceTable = this.#renderResourceTable()
    const descriptors = this.#operations.map((operation) => this.#renderOperation(operation))
    const operationTable = this.#renderOperationTable()
    const bind = this.#renderBind(namespaces, appMethods)
    const contract = this.#renderContract()
    const enumTuples = this.#renderEnumTuples()

    this.#checkNames(namespaces, appMethods)

    return [
      this.#renderHeader(),
      // ValueType annotates the record and create input value types, which a
      // manifest whose every resource is marked unsupported has none of.
      this.#renderImports(recordValues.length + createValues.length > 0),
      'const t = ValueTypes\n',
      ...enumTypes,
      ...records,
      ...inputs,
      ...clientTypes,
      ...enumTuples,
      ...recordValues,
      ...createValues,
      resourceTable,
      ...descriptors,
      operationTable,
      bind,
      contract,
    ].join('\n')
  }

  // --- Derivation ---------------------------------------------------------

  #map(type: DeclaredType, position: ValuePosition): ValueShape {
    return mapDeclaredType(type, position, this.#resolver).shape
  }

  /** The primary identifier property of a resource, when it declares one. */
  #identifierProperty(resource: Resource): { type: DeclaredType; description: string } | undefined {
    const property = resolvePrimaryIdentifierProperty(resource)
    if (property === undefined) return undefined
    const declared = resource.properties[property]
    // An identifier the resource does not also declare as a property has no
    // declared type; it is a string, the default property type.
    return declared === undefined
      ? { type: undefined, description: `The ${resource.name} identifier.` }
      : { type: declared.type, description: declared.description }
  }

  #routeOf(commandKey: string, resourceType: string | undefined): string {
    return `${commandKey}\u0000${resourceType ?? ''}`
  }

  #deriveOperations(): void {
    const used = new Set<string>()
    for (const route of resolveManifestRoutes(this.#manifest)) {
      const binding = uniqueName(
        `${lowerCamel(route.resourceType ?? 'App')}${upperFirst(route.commandKey)}Operation`,
        used
      )
      this.#privateBindings.add(binding)
      if (!PERMISSION_SHAPE.test(route.permission)) {
        this.errors.push(
          `${route.route}: the permission ${JSON.stringify(route.permission)} is not of the form app:resource:operation.`
        )
      }
      const operation: OperationModel = {
        route,
        binding,
        input: this.#inputModel(route),
        output: this.#outputModel(route),
      }
      this.#operations.push(operation)
      this.#operationsByRoute.set(this.#routeOf(route.commandKey, route.resourceType), operation)
    }
  }

  /** The CRUD shape a route fulfils, judged by command name (resource scope only). */
  #crudShape(route: ManifestRoute): CrudOperation | undefined {
    if (route.command.scope !== 'resource') return undefined
    return isCrudName(route.command.name) ? route.command.name : undefined
  }

  /**
   * Whether the route's command is the one its resource's client method uses
   * for its CRUD shape: the first command of that name.
   */
  #isChosenCrud(route: ManifestRoute, shape: CrudOperation): boolean {
    if (route.resourceType === undefined) return false
    const chosen = findCrudCommand(
      resourceCommandEntries(this.#manifest, route.resourceType),
      shape
    )
    return chosen?.[0] === route.commandKey
  }

  /**
   * The input record of a route: the command's parameters, plus whatever the
   * client method sends for the route's CRUD shape (identifier parameters, and
   * create or update input fields), keyed exactly as sent.
   */
  #inputModel(route: ManifestRoute): InputModel {
    const shape = this.#crudShape(route)
    const resourceKey = route.resourceType
    if (shape === 'list') this.#checkPagingNames(route)
    if (shape === 'create' && resourceKey !== undefined && this.#isChosenCrud(route, shape)) {
      return { kind: 'create', resourceKey }
    }
    const fields = new Map<string, FieldModel>()
    const identifiers = new Map<string, FieldModel>()
    if (
      (shape === 'get' || shape === 'update' || shape === 'delete') &&
      this.#isChosenCrud(route, shape)
    ) {
      for (const field of this.#identifierFields(route.command)) identifiers.set(field.name, field)
    }
    for (const [name, field] of identifiers) fields.set(name, field)
    if (shape === 'update' && resourceKey !== undefined && this.#isChosenCrud(route, shape)) {
      for (const field of this.#updateInputFields(resourceKey)) fields.set(field.name, field)
    }
    for (const param of route.command.parameters) {
      if (fields.has(param.name)) continue
      fields.set(param.name, this.#parameterField(param))
    }
    return { kind: 'fields', fields: [...fields.values()], paged: this.#pages(route) }
  }

  /**
   * Whether the route is a list that pages: a list operation of a resource
   * that has an identifier, which anchors each page on its last item. A list
   * of a resource with no identifier takes no paging inputs and returns its
   * whole collection as one page.
   */
  #pages(route: ManifestRoute): boolean {
    if (this.#crudShape(route) !== 'list' || route.resource === undefined) return false
    return this.#identifierProperty(route.resource) !== undefined
  }

  /**
   * A list operation reserves the paging input names, so no app parameter of
   * one may use them: the generated input would otherwise declare one field
   * twice, with two meanings.
   */
  #checkPagingNames(route: ManifestRoute): void {
    const reserved: readonly string[] = PAGING_INPUT_NAMES
    for (const param of route.command.parameters) {
      if (reserved.includes(param.name)) {
        this.errors.push(
          `${route.route}: the parameter ${JSON.stringify(param.name)} uses a name list operations reserve for paging (${PAGING_INPUT_NAMES.join(', ')}); rename the parameter in the manifest.`
        )
      }
    }
  }

  /**
   * A request field for a command parameter. It accepts `null` only when the
   * manifest claims so, with evidence (inputs default to non-null).
   */
  #parameterField(param: CommandParameter): FieldModel {
    const resolution = resolveParameterNullability(param)
    const shape = this.#map(param.type, 'input')
    return {
      name: param.name,
      shape: resolution.nullable ? nullableShape(shape) : shape,
      optional: !param.required,
      description: param.description,
      nullabilityNote: parameterNullabilityNote(resolution, this.#manifest.app.name),
    }
  }

  /**
   * The fields of a resource's record, the read position: each property is
   * nullable unless there is evidence that the app always sets it (see
   * `resolveReadNullability`), and optional when the manifest says so.
   */
  #recordFields(resource: Resource): (FieldModel & { readonly readOnly: boolean })[] {
    return usableProperties(resource).map(([name, prop]) => {
      const resolution = resolveReadNullability(resource, name, prop)
      const shape = this.#map(prop.type, 'output')
      return {
        name,
        shape: resolution.nullable ? nullableShape(shape) : shape,
        optional: prop.optional,
        description: prop.description,
        nullabilityNote: readNullabilityNote(resolution, this.#manifest.app.name),
        readOnly: prop.access === 'r',
      }
    })
  }

  /**
   * The identifier parameters of a get, update, or delete command, in
   * positional order (parent scope, then child), each typed by its parameter
   * declaration. A child identifier the command does not declare (it has no
   * required parameters) is a string named `id`.
   */
  #identifierFields(command: Command): FieldModel[] {
    const { parentParam, childParam } = resolveIdParams(command)
    const field = (name: string): FieldModel => {
      const param = command.parameters.find((p) => p.name === name)
      return param === undefined
        ? { name, shape: { kind: 'string' }, optional: false, description: `The ${name}.` }
        : { ...this.#parameterField(param), optional: false }
    }
    return parentParam === undefined ? [field(childParam)] : [field(parentParam), field(childParam)]
  }

  /**
   * The create input fields of a resource. They are never nullable (D10): a
   * property's `nullable` claim describes reads, not what a create accepts,
   * and there is no claim kind for create inputs.
   */
  #createInputFields(resourceKey: string): FieldModel[] {
    return [...createInputFields(this.#manifest, resourceKey)].map(([name, field]) => ({
      name,
      shape: this.#map(field.type, 'input'),
      optional: !field.required,
      description: field.description,
    }))
  }

  /**
   * The update input fields of a resource: every create input field except the
   * identifiers the update command takes positionally, all optional, so an
   * omitted field is unchanged. A field accepts `null`, meaning "reset", only
   * when the property of that name is verified resettable; elsewhere `null` is
   * rejected rather than attempted.
   */
  #updateInputFields(resourceKey: string): FieldModel[] {
    const update = findCrudCommand(resourceCommandEntries(this.#manifest, resourceKey), 'update')
    const positional = new Set<string>()
    if (update !== undefined) {
      const { parentParam, childParam } = resolveIdParams(update[1])
      positional.add(childParam)
      if (parentParam !== undefined) positional.add(parentParam)
    }
    const properties: Readonly<Record<string, Property>> =
      this.#manifest.resources[resourceKey]?.properties ?? {}
    return this.#createInputFields(resourceKey)
      .filter((field) => !positional.has(field.name))
      .map((field) => {
        const property = Object.hasOwn(properties, field.name) ? properties[field.name] : undefined
        const reset = property === undefined ? undefined : resolveResettability(property)
        return reset === undefined
          ? { ...field, optional: true, nullabilityNote: 'Cannot be reset: null is rejected.' }
          : {
              ...field,
              shape: nullableShape(field.shape),
              optional: true,
              nullabilityNote: `Set to null to reset: ${curatedBasis(this.#manifest.app.name, reset)}`,
            }
      })
  }

  #outputModel(route: ManifestRoute): OutputModel {
    const shape = this.#crudShape(route)
    const resourceKey = route.resourceType
    if (shape !== undefined && resourceKey !== undefined) {
      if (route.resource === undefined) {
        this.errors.push(`${route.route}: the command targets the unknown resource ${resourceKey}.`)
        return { kind: 'value', shape: { kind: 'unknown' } }
      }
      switch (shape) {
        case 'list':
          return { kind: 'page', resourceKey }
        case 'get':
        case 'create':
        case 'update':
          return { kind: 'record', resourceKey }
        case 'delete':
          return { kind: 'none' }
      }
    }
    // A command's result is an output, so it is nullable by default, like a
    // read field: a manifest has no evidence that a command always returns a
    // value. (CRUD results above are never nullable: a missing target fails
    // the operation, and a list is a page, possibly empty.)
    const returns = route.command.returns
    return returns === undefined
      ? { kind: 'none' }
      : { kind: 'value', shape: nullableShape(this.#map(returns, 'output')) }
  }

  #deriveNamespaces(): NamespaceModel[] {
    const namespaces: NamespaceModel[] = []
    for (const [resourceKey, resource] of usableResources(this.#manifest)) {
      if (!resourceHasOperations(this.#manifest, resourceKey)) continue
      const commands = resourceCommandEntries(this.#manifest, resourceKey)
      const methods: MethodModel[] = []
      const crud = (shape: CrudOperation): [Command, OperationModel] | undefined => {
        const found = findCrudCommand(commands, shape)
        if (found === undefined) return undefined
        const operation = this.#operationsByRoute.get(this.#routeOf(found[0], resourceKey))
        return operation === undefined ? undefined : [found[1], operation]
      }
      const list = crud('list')
      if (list) methods.push(this.#listMethod(resource, ...list))
      const get = crud('get')
      if (get) methods.push(this.#getMethod(resource, ...get))
      const create = crud('create')
      if (create) methods.push(this.#createMethod(resourceKey, resource, create[1]))
      const update = crud('update')
      if (update) methods.push(this.#updateMethod(resourceKey, resource, ...update))
      const remove = crud('delete')
      if (remove) methods.push(this.#deleteMethod(resource, ...remove))
      for (const [commandKey, command] of commands) {
        if (isCrudName(command.name)) continue
        const operation = this.#operationsByRoute.get(this.#routeOf(commandKey, resourceKey))
        if (operation !== undefined) methods.push(this.#commandMethod(command, operation))
      }
      namespaces.push({
        name: resourceNamespace(resource),
        interfaceName: `${resourceKey}ResourceClient`,
        description: resource.description,
        methods,
      })
    }
    return namespaces
  }

  #positional(fields: readonly FieldModel[]): MethodModel['params'] {
    return fields.map((field) => ({
      binding: safeIdentifier(field.name),
      type: this.#renderer.sdkType(field.shape),
      optional: false,
      doc: fieldDoc(field, ' '),
    }))
  }

  #bodyFields(fields: readonly FieldModel[]): { field: string; binding: string }[] {
    return fields.map((field) => ({ field: field.name, binding: safeIdentifier(field.name) }))
  }

  #listMethod(resource: Resource, command: Command, operation: OperationModel): MethodModel {
    const fields = listMethodParameters(command).map((param) => ({
      ...this.#parameterField(param),
      optional: false,
    }))
    const params = this.#positional(fields)
    const returnType = `${this.#pagingNames.page}<${resource.name}>`
    const paged = operation.input.kind === 'fields' && operation.input.paged
    if (!paged) {
      return {
        name: 'list',
        doc: `List ${identifierWords(resource.plural)}, as one page holding all of them.`,
        params,
        returnType,
        operation,
        body: { kind: 'fields', fields: this.#bodyFields(fields) },
      }
    }
    const page = uniqueName('page', new Set(params.map((param) => param.binding)))
    return {
      name: 'list',
      doc: `List ${identifierWords(resource.plural)}, one page at a time.`,
      params: [
        ...params,
        {
          binding: page,
          type: this.#pagingNames.pageRequest,
          optional: true,
          doc: 'The page size, and the cursor that continues from the previous page.',
        },
      ],
      returnsDoc:
        'One page of results. When `nextCursor` is present, more remain: call again with the same arguments and that cursor.',
      returnType,
      operation,
      body: { kind: 'input-with-fields', binding: page, fields: this.#bodyFields(fields) },
    }
  }

  #identified(resource: Resource, command: Command): { fields: FieldModel[]; phrase: string } {
    const fields = this.#identifierFields(command)
    const { parentParam, childParam } = resolveIdParams(command)
    const scope = parentParam === undefined ? '' : ` within \`${parentParam}\``
    return {
      fields,
      phrase: `the ${identifierWords(resource.name)} identified by \`${childParam}\`${scope}`,
    }
  }

  #getMethod(resource: Resource, command: Command, operation: OperationModel): MethodModel {
    const { fields, phrase } = this.#identified(resource, command)
    return {
      name: 'get',
      doc: `Read ${phrase}.`,
      params: this.#positional(fields),
      returnType: resource.name,
      operation,
      body: { kind: 'fields', fields: this.#bodyFields(fields) },
    }
  }

  #createMethod(resourceKey: string, resource: Resource, operation: OperationModel): MethodModel {
    return {
      name: 'create',
      doc: `Create ${withArticle(identifierWords(resource.name))}.`,
      params: [{ binding: 'input', type: `${resourceKey}CreateInput`, optional: false }],
      returnType: resource.name,
      operation,
      body: { kind: 'input', binding: 'input' },
    }
  }

  #updateMethod(
    resourceKey: string,
    resource: Resource,
    command: Command,
    operation: OperationModel
  ): MethodModel {
    const { fields, phrase } = this.#identified(resource, command)
    const params = this.#positional(fields)
    const input = uniqueName('input', new Set(params.map((param) => param.binding)))
    return {
      name: 'update',
      doc: `Update ${phrase}. Omitted fields are left unchanged.`,
      params: [...params, { binding: input, type: `${resourceKey}UpdateInput`, optional: false }],
      returnType: resource.name,
      operation,
      body: { kind: 'input-with-fields', binding: input, fields: this.#bodyFields(fields) },
    }
  }

  #deleteMethod(resource: Resource, command: Command, operation: OperationModel): MethodModel {
    const { fields, phrase } = this.#identified(resource, command)
    return {
      name: 'delete',
      doc: `Delete ${phrase}.`,
      params: this.#positional(fields),
      returnType: 'void',
      operation,
      body: { kind: 'fields', fields: this.#bodyFields(fields) },
    }
  }

  /** A method for an app command or a resource command that is not a CRUD shape. */
  #commandMethod(command: Command, operation: OperationModel): MethodModel {
    const { signature, body } = commandMethodParameters(command)
    const output = operation.output
    return {
      name: safeIdentifier(command.name),
      doc: command.description,
      params: signature.map(({ parameter, bindingName, optional }) => {
        const field = this.#parameterField(parameter)
        return {
          binding: bindingName,
          type: this.#renderer.sdkType(field.shape),
          optional,
          doc: fieldDoc(field, ' '),
        }
      }),
      returnType: output.kind === 'none' ? 'void' : this.#outputType(output),
      ...(output.kind === 'value' && output.shape.kind === 'nullable'
        ? { returnsDoc: RESULT_NULLABILITY_NOTE }
        : {}),
      operation,
      body: {
        kind: 'fields',
        fields: body.map(({ fieldName, bindingName }) => ({
          field: fieldName,
          binding: bindingName,
        })),
      },
    }
  }

  // --- Rendering: types ---------------------------------------------------

  #renderHeader(): string {
    const { client } = this.#names
    const appName = this.#manifest.app.name
    return `/**
 * The ${appName} contract: the transport-neutral description of every
 * ${appName} operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the \`${client}\` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from \`@macts/sdk\`, local or remote, which supplies the runtime that
 * \`bind\` turns into a \`${client}\`; application code changes locality by
 * changing the factory, not the contract.
 *
 * ${manifestGeneratedNotice(appName)}
 *
 * @packageDocumentation
 */
`
  }

  #renderImports(usesValueType: boolean): string {
    const types: string[] = CONTRACT_BASE_TYPE_IMPORTS.filter(
      (name) => usesValueType || name !== 'ValueType'
    )
    const used: readonly ContractTypeName[] = [...this.#renderer.usedTypes]
    types.push(...used)
    const named = types.map((name) => ({ imported: name, local: name }))
    named.push(...this.#pageTypeImportSpecifiers())
    const specifiers = [
      ...CONTRACT_VALUE_IMPORTS,
      ...named
        .sort((a, b) => a.imported.localeCompare(b.imported))
        .map(({ imported, local }) =>
          imported === local ? `type ${imported}` : `type ${imported} as ${local}`
        ),
    ]
    return `import {\n${specifiers.map((s) => `  ${s},`).join('\n')}\n} from '@macts/contracts'\n`
  }

  /**
   * The paging types the module imports, under their local names: `Page` when
   * an operation returns a page, `PageRequest` when an operation takes the
   * paging inputs.
   */
  #pageTypeImportSpecifiers(): { imported: string; local: string }[] {
    const imports: { imported: string; local: string }[] = []
    if (this.#operations.some((operation) => operation.output.kind === 'page')) {
      imports.push({ imported: 'Page', local: this.#pagingNames.page })
    }
    if (this.#operations.some((op) => op.input.kind === 'fields' && op.input.paged)) {
      imports.push({ imported: 'PageRequest', local: this.#pagingNames.pageRequest })
    }
    return imports
  }

  #renderEnumTypes(): string[] {
    return Object.entries(this.#manifest.enums).map(([enumKey, enumDef]) => {
      const members = enumMembers(enumDef.values).map(stringLiteral).join(' | ')
      return `${docComment(enumDef.description ?? enumKey, '')}export type ${enumKey} = ${members}\n`
    })
  }

  #renderEnumTuples(): string[] {
    return Object.entries(this.#manifest.enums)
      .filter(([enumKey]) => this.#renderer.usedEnums.has(enumKey))
      .map(([enumKey, enumDef]) => {
        const binding = `${lowerCamel(enumKey)}Members`
        this.#privateBindings.add(binding)
        const members = enumMembers(enumDef.values).map(stringLiteral).join(', ')
        return `/** The members of {@link ${enumKey}}, for its value type. */\nconst ${binding} = [${members}] as const\n`
      })
  }

  #renderRecordInterfaces(): string[] {
    return usableResources(this.#manifest).map(([resourceKey, resource]) => {
      const fields = this.#recordFields(resource)
      const doc = docComment(resource.description, '')
      if (fields.length === 0) return `${doc}export type ${resourceKey} = Record<string, never>\n`
      const lines = fields.map((field) => {
        const readonly = field.readOnly ? 'readonly ' : ''
        const optional = field.optional ? '?' : ''
        const type = this.#renderer.sdkType(field.shape)
        return `${docComment(fieldDoc(field), '  ')}  ${readonly}${propertyKey(field.name)}${optional}: ${type}`
      })
      return `${doc}export interface ${resourceKey} {\n${lines.join('\n')}\n}\n`
    })
  }

  #renderInputInterfaces(): string[] {
    return usableResources(this.#manifest).flatMap(([resourceKey, resource]) => [
      this.#renderInputInterface(
        `${resourceKey}CreateInput`,
        `Input for creating ${withArticle(resource.name)}.`,
        this.#createInputFields(resourceKey)
      ),
      this.#renderInputInterface(
        `${resourceKey}UpdateInput`,
        `Input for updating ${withArticle(resource.name)}. Omitted fields are left unchanged.`,
        this.#updateInputFields(resourceKey)
      ),
    ])
  }

  #renderInputInterface(name: string, description: string, fields: readonly FieldModel[]): string {
    const doc = docComment(description, '')
    if (fields.length === 0) return `${doc}export type ${name} = Record<string, never>\n`
    const lines = fields.map(
      (field) =>
        `${docComment(fieldDoc(field), '  ')}  ${propertyKey(field.name)}${field.optional ? '?' : ''}: ${this.#renderer.sdkType(field.shape)}`
    )
    return `${doc}export interface ${name} {\n${lines.join('\n')}\n}\n`
  }

  #renderClientInterfaces(
    namespaces: readonly NamespaceModel[],
    appMethods: readonly MethodModel[]
  ): string[] {
    const namespaceInterfaces = namespaces.map((namespace) => {
      const doc = docComment(namespace.description, '')
      if (namespace.methods.length === 0) {
        return `${doc}export type ${namespace.interfaceName} = Record<string, never>\n`
      }
      const members = namespace.methods.map((method) => this.#renderMethodSignature(method))
      return `${doc}export interface ${namespace.interfaceName} {\n${members.join('\n')}\n}\n`
    })
    const { client, contract } = this.#names
    const members = [
      ...namespaces.map(
        (namespace) =>
          `${docComment(namespace.description, '  ')}  readonly ${namespace.name}: ${namespace.interfaceName}`
      ),
      ...appMethods.map((method) => this.#renderMethodSignature(method)),
    ]
    const doc = docComment(
      `The ${this.#manifest.app.name} client: one namespace per resource that has operations, plus the app's own commands. A client factory creates one from {@link ${contract}}.`,
      ''
    )
    const body =
      members.length === 0
        ? `export type ${client} = Record<string, never>\n`
        : `export interface ${client} {\n${members.join('\n')}\n}\n`
    return [...namespaceInterfaces, `${doc}${body}`]
  }

  #renderMethodSignature(method: MethodModel): string {
    const options = callOptionsBinding(method)
    const params = [
      ...method.params.map((p) => `${p.binding}${p.optional ? '?' : ''}: ${p.type}`),
      `${options}?: CallOptions`,
    ].join(', ')
    const tags = [
      ...method.params.flatMap((p) =>
        p.doc === undefined ? [] : [`@param ${p.binding} - ${p.doc}`]
      ),
      ...(method.returnsDoc === undefined ? [] : [`@returns ${method.returnsDoc}`]),
    ]
    const doc = tags.length === 0 ? method.doc : `${method.doc}\n\n${tags.join('\n')}`
    return `${docComment(doc, '  ')}  ${method.name}(${params}): Promise<${method.returnType}>`
  }

  // --- Rendering: values --------------------------------------------------

  #recordBinding(resourceKey: string): string {
    return `${lowerCamel(resourceKey)}RecordType`
  }

  #createInputBinding(resourceKey: string): string {
    return `${lowerCamel(resourceKey)}CreateInputType`
  }

  /** The fields object of a `t.record(…)` call, its lines indented by `indent`. */
  #renderRecordFields(fields: readonly FieldModel[], indent = ''): string {
    if (fields.length === 0) return '{}'
    const lines = fields.map((field) => {
      const expression = this.#renderer.expression(field.shape, field.description)
      return `${indent}  ${propertyKey(field.name)}: ${field.optional ? `t.optional(${expression})` : expression},`
    })
    return `{\n${lines.join('\n')}\n${indent}}`
  }

  /**
   * The fields object of an operation's request record: its fields, then the
   * paging inputs when the operation pages, so the paging inputs are built by
   * the one constructor every list shares.
   */
  #renderRequestFields(fields: readonly FieldModel[], paged: boolean): string {
    if (!paged) return this.#renderRecordFields(fields, '  ')
    const lines = fields.map((field) => {
      const expression = this.#renderer.expression(field.shape, field.description)
      return `    ${propertyKey(field.name)}: ${field.optional ? `t.optional(${expression})` : expression},`
    })
    return `{\n${[...lines, '    ...t.pageInputs(),'].join('\n')}\n  }`
  }

  #renderRecordValueTypes(): string[] {
    return usableResources(this.#manifest).map(([resourceKey, resource]) => {
      const binding = this.#recordBinding(resourceKey)
      this.#privateBindings.add(binding)
      const fields = this.#recordFields(resource)
      return `const ${binding}: ValueType<${resourceKey}> = t.record(${this.#renderRecordFields(fields)}, { description: ${stringLiteral(resource.description)} })\n`
    })
  }

  #renderCreateInputValueTypes(): string[] {
    const resourceKeys = new Set(
      this.#operations.flatMap((operation) =>
        operation.input.kind === 'create' ? [operation.input.resourceKey] : []
      )
    )
    return [...resourceKeys].map((resourceKey) => {
      const binding = this.#createInputBinding(resourceKey)
      this.#privateBindings.add(binding)
      const fields = this.#renderRecordFields(this.#createInputFields(resourceKey))
      return `const ${binding}: ValueType<${resourceKey}CreateInput> = t.record(${fields})\n`
    })
  }

  #renderResourceTable(): string {
    const entries = usableResources(this.#manifest).map(([resourceKey, resource]) => {
      const members = [
        `name: ${stringLiteral(resourceKey)}`,
        `record: ${this.#recordBinding(resourceKey)}`,
      ]
      const identifier = this.#identifierProperty(resource)
      const identifierShape = this.#identifiers.get(resourceKey)
      if (identifier !== undefined && identifierShape !== undefined) {
        members.push(`id: ${this.#renderer.expression(identifierShape, identifier.description)}`)
      }
      const commands = resourceCommandEntries(this.#manifest, resourceKey)
      for (const shape of ['get', 'list'] as const) {
        const found = findCrudCommand(commands, shape)
        const operation =
          found === undefined
            ? undefined
            : this.#operationsByRoute.get(this.#routeOf(found[0], resourceKey))
        if (operation !== undefined) {
          members.push(`${shape}: ${stringLiteral(operation.route.route)}`)
        }
      }
      return `  ${propertyKey(resourceKey)}: {\n${members.map((m) => `    ${m},`).join('\n')}\n  },`
    })
    const { client } = this.#names
    return `/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<${client}>['resources'] = {
${entries.join('\n')}
}
`
  }

  #inputType(input: InputModel): string {
    if (input.kind === 'create') return `${input.resourceKey}CreateInput`
    if (input.paged) {
      const base = this.#inputType({ ...input, paged: false })
      const { pageRequest } = this.#pagingNames
      return input.fields.length === 0 ? pageRequest : `${base} & ${pageRequest}`
    }
    if (input.fields.length === 0) return 'Record<string, never>'
    const members = input.fields.map((field) => {
      const type = this.#renderer.sdkType(field.shape)
      // Optional request fields also accept `undefined`, which encodes as
      // absent, so methods can forward optional arguments as they are.
      // (`unknown` already includes it.)
      if (!field.optional) return `readonly ${propertyKey(field.name)}: ${type}`
      const orUndefined = type === 'unknown' ? '' : ' | undefined'
      return `readonly ${propertyKey(field.name)}?: ${type}${orUndefined}`
    })
    return `{ ${members.join('; ')} }`
  }

  #outputType(output: OutputModel): string {
    switch (output.kind) {
      case 'none':
        return 'undefined'
      case 'record':
        return output.resourceKey
      case 'page':
        return `${this.#pagingNames.page}<${output.resourceKey}>`
      case 'value':
        return this.#renderer.sdkType(output.shape)
    }
  }

  #outputExpression(output: OutputModel): string {
    switch (output.kind) {
      case 'none':
        return 't.none()'
      case 'record':
        return this.#recordBinding(output.resourceKey)
      case 'page':
        return `t.page(${this.#recordBinding(output.resourceKey)})`
      case 'value':
        return this.#renderer.expression(output.shape)
    }
  }

  /**
   * The input value type of an operation, built in process exactly as the
   * descriptor's `input` expression constructs it: a create input's record,
   * or the request record spelled out field by field. Neither carries a
   * description of its own.
   */
  #buildInput(input: InputModel): ValueType<unknown> {
    const fields =
      input.kind === 'create' ? this.#createInputFields(input.resourceKey) : input.fields
    const built: Record<string, RecordField> = {}
    for (const field of fields) {
      const type = this.#builder.build(field.shape, field.description)
      built[field.name] = field.optional ? t.optional(type) : type
    }
    return t.record(
      input.kind === 'fields' && input.paged ? { ...built, ...t.pageInputs() } : built
    )
  }

  /**
   * The descriptor's `inputJsonSchema`: the draft-7 JSON Schema of its input's
   * wire values, derived from the built input value type by the same call an
   * adapter makes (phases/13 D9), so it is never written by hand.
   */
  #inputJsonSchema(input: InputModel): string {
    return JSON.stringify(z.toJSONSchema(this.#buildInput(input).wire, { target: 'draft-7' }))
  }

  #renderOperation(operation: OperationModel): string {
    const { route } = operation
    const input =
      operation.input.kind === 'create'
        ? this.#createInputBinding(operation.input.resourceKey)
        : `t.record(${this.#renderRequestFields(operation.input.fields, operation.input.paged)})`
    const target =
      route.resourceType === undefined
        ? `{ command: ${stringLiteral(route.commandKey)} }`
        : `{ command: ${stringLiteral(route.commandKey)}, resource: ${stringLiteral(route.resourceType)} }`
    return `const ${operation.binding}: OperationDescriptor<${this.#inputType(operation.input)}, ${this.#outputType(operation.output)}> = {
  id: ${stringLiteral(route.route)},
  permission: ${stringLiteral(route.permission)},
  target: ${target},
  description: ${stringLiteral(route.command.description)},
  input: ${input},
  output: ${this.#outputExpression(operation.output)},
  inputJsonSchema: ${this.#inputJsonSchema(operation.input)},
}
`
  }

  #renderOperationTable(): string {
    const { client } = this.#names
    const entries = this.#operations.map(
      (operation) => `  ${stringLiteral(operation.route.route)}: ${operation.binding},`
    )
    return `/** Every operation, keyed by its identity. */
const operations: AppContract<${client}>['operations'] = {
${entries.join('\n')}
}
`
  }

  #renderBind(namespaces: readonly NamespaceModel[], appMethods: readonly MethodModel[]): string {
    const allMethods = [...namespaces.flatMap((namespace) => namespace.methods), ...appMethods]
    const runtime = uniqueName(
      'runtime',
      new Set(
        allMethods.flatMap((method) => [
          ...method.params.map((p) => p.binding),
          callOptionsBinding(method),
        ])
      )
    )
    const method = (m: MethodModel, indent: string): string => {
      const options = callOptionsBinding(m)
      const params = [...m.params.map((p) => p.binding), options].join(', ')
      return `${indent}${m.name}: (${params}) => ${runtime}.invoke(${m.operation.binding}, ${renderBody(m.body)}, ${options}),`
    }
    const members = [
      ...namespaces.map(
        (namespace) =>
          `    ${namespace.name}: {\n${namespace.methods.map((m) => method(m, '      ')).join('\n')}\n    },`
      ),
      ...appMethods.map((m) => method(m, '    ')),
    ]
    const { client } = this.#names
    return `/** Build the client on top of a factory-supplied runtime. */
function bind(${runtime}: ClientRuntime): ${client} {
  return {
${members.join('\n')}
  }
}
`
  }

  #renderContract(): string {
    const { app, client, contract } = this.#names
    return `/**
 * The ${this.#manifest.app.name} contract. Pass it to a client factory to obtain a
 * {@link ${client}}.
 */
export const ${contract}: AppContract<${client}> = {
  app: ${stringLiteral(app)},
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
`
  }

  // --- Checks -------------------------------------------------------------

  /**
   * Every top-level name must be unique (manifest-derived exports, private
   * bindings, and contract imports share one module scope), and so must the
   * members of each client interface.
   */
  #checkNames(namespaces: readonly NamespaceModel[], appMethods: readonly MethodModel[]): void {
    const exported = [
      ...Object.keys(this.#manifest.enums),
      ...usableResources(this.#manifest).flatMap(([key]) => [
        key,
        `${key}CreateInput`,
        `${key}UpdateInput`,
      ]),
      ...namespaces.map((namespace) => namespace.interfaceName),
      this.#names.client,
      this.#names.contract,
    ]
    const imported = [
      ...CONTRACT_VALUE_IMPORTS,
      ...CONTRACT_BASE_TYPE_IMPORTS,
      ...this.#pageTypeImportSpecifiers().map((specifier) => specifier.local),
      ...this.#renderer.usedTypes,
    ]
    reportDuplicates(
      [...exported, ...this.#privateBindings, ...imported],
      'module scope',
      this.errors,
      this.#names.app
    )
    for (const namespace of namespaces) {
      reportDuplicates(
        namespace.methods.map((m) => m.name),
        `the ${namespace.name} namespace`,
        this.errors,
        this.#names.app
      )
    }
    reportDuplicates(
      [...namespaces.map((n) => n.name), ...appMethods.map((m) => m.name)],
      `the ${this.#names.client} interface`,
      this.errors,
      this.#names.app
    )
  }
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

/** The `@returns` text of a command result, which is nullable by default. */
const RESULT_NULLABILITY_NOTE = 'Nullable. No evidence that the app always returns a value.'

/**
 * A field's documentation: its description, then its nullability note, on
 * the next line (`separator`, for a field's own comment) or the same one (for
 * a `@param` tag).
 */
function fieldDoc(field: FieldModel, separator = '\n'): string {
  return field.nullabilityNote === undefined
    ? field.description
    : `${sentence(field.description)}${separator}${field.nullabilityNote}`
}

/** `text` as a sentence: trimmed, ending in a period unless it ends in punctuation. */
function sentence(text: string): string {
  const trimmed = text.trim()
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

/**
 * The version and date an observation holds for, e.g.
 * `Notes 4.11, macOS 27.2, 2026-10-31`. It names where the evidence came
 * from, never an observed value.
 */
function observationProvenance(
  appName: string,
  evidence: { readonly appVersion: string; readonly osVersion: string; readonly observedAt: string }
): string {
  const date = /^\d{4}-\d{2}-\d{2}/.exec(evidence.observedAt)?.[0] ?? evidence.observedAt
  return `${appName} ${evidence.appVersion}, macOS ${evidence.osVersion}, ${date}`
}

/** A curated claim's note, with the app version it was confirmed against when recorded. */
function curatedBasis(
  appName: string,
  evidence: { readonly note: string; readonly appVersion?: string | undefined }
): string {
  const note = evidence.note.trim().replace(/[.!?]$/, '')
  return evidence.appVersion === undefined
    ? `${note}.`
    : `${note} (${appName} ${evidence.appVersion}).`
}

/**
 * The doc line for a read field: whether it can be null, and why, in words
 * for callers. It never states an observed value.
 */
export function readNullabilityNote(resolution: NullabilityResolution, appName: string): string {
  const { nullable, basis } = resolution
  if (basis === 'identifier') return 'Never null: the primary identifier.'
  if (basis === 'default') {
    return nullable ? 'Nullable. No evidence that the app always sets it.' : 'Never null.'
  }
  switch (basis.source) {
    case 'probe': {
      const provenance = observationProvenance(appName, basis)
      return nullable
        ? `Nullable. Observed missing in ${String(basis.nullCount)} of ${String(basis.sampleSize)} items (${provenance}).`
        : `Never null: observed in all ${String(basis.sampleSize)} items (${provenance}).`
    }
    case 'curated':
      return `${nullable ? 'Nullable' : 'Never null'}: ${curatedBasis(appName, basis)}`
    case 'sdef':
      return "Nullable: declared by the app's scripting dictionary."
  }
}

/**
 * The doc line for a parameter: whether it accepts `null`, and why. Without a
 * claim it does not.
 */
export function parameterNullabilityNote(
  resolution: NullabilityResolution,
  appName: string
): string {
  const { nullable, basis } = resolution
  const verdict = nullable ? 'Accepts null' : 'Does not accept null'
  if (basis === 'default' || basis === 'identifier') return `${verdict}.`
  switch (basis.source) {
    case 'probe':
      return `${verdict}.`
    case 'curated':
      return `${verdict}: ${curatedBasis(appName, basis)}`
    case 'sdef':
      return `${verdict}: declared by the app's scripting dictionary.`
  }
}

/** The string members of an enum: each value, as text. */
function enumMembers(values: readonly { readonly value: string | number }[]): string[] {
  return values.map((v) => String(v.value))
}

/** The binding of a method's trailing call options, avoiding its parameters. */
function callOptionsBinding(method: MethodModel): string {
  return uniqueName('options', new Set(method.params.map((p) => p.binding)))
}

function renderBody(body: MethodModel['body']): string {
  const fields = (entries: readonly { field: string; binding: string }[]): string =>
    entries
      .map(({ field, binding }) =>
        field === binding ? binding : `${propertyKey(field)}: ${binding}`
      )
      .join(', ')
  switch (body.kind) {
    case 'input':
      return body.binding
    case 'fields':
      return body.fields.length === 0 ? '{}' : `{ ${fields(body.fields)} }`
    case 'input-with-fields':
      // Positional identifiers come last so they win over any same-named key
      // an untyped caller slips into the input.
      return body.fields.length === 0
        ? `{ ...${body.binding} }`
        : `{ ...${body.binding}, ${fields(body.fields)} }`
  }
}

/** A property key: bare when it is an identifier, quoted otherwise. */
function propertyKey(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : stringLiteral(name)
}

/** The width generated doc comments wrap at, matching the formatter's line width. */
const DOC_WIDTH = 100

/**
 * A JSDoc comment for `text` at `indent`, safe for any text: a `*\/` in the
 * text cannot end the comment, and long lines wrap at word boundaries.
 */
function docComment(text: string, indent: string): string {
  const escaped = text.replace(/\*\//g, '*\\/').trim()
  const single = `${indent}/** ${escaped} */`
  if (!escaped.includes('\n') && single.length <= DOC_WIDTH) return `${single}\n`
  const width = DOC_WIDTH - indent.length - ' * '.length
  const lines = escaped.split(/\r?\n/).flatMap((line) => wrap(line, width))
  return `${indent}/**\n${lines.map((line) => `${indent} * ${line}`.trimEnd()).join('\n')}\n${indent} */\n`
}

/** Break `line` into lines of at most `width` characters, at spaces. */
function wrap(line: string, width: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of line.split(' ')) {
    if (current !== '' && current.length + 1 + word.length > width) {
      lines.push(current)
      current = word
    } else {
      current = current === '' ? word : `${current} ${word}`
    }
  }
  lines.push(current)
  return lines
}

function upperFirst(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** `a note`, `an event`: the noun with an indefinite article. */
function withArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`
}

/** `base`, or `base2`, `base3`, … : the first not in `used`, which it joins. */
/**
 * The local names of the paging types in an app's contract module: `Page` and
 * `PageRequest`, unless the manifest declares a type of that name (an enum, a
 * resource, or a resource's create or update input), in which case the import
 * is aliased `MactsPage` / `MactsPageRequest` (numbered if those are taken too).
 */
function pagingTypeNames(manifest: AppManifest): { page: string; pageRequest: string } {
  const declared = new Set<string>(Object.keys(manifest.enums))
  for (const [key] of usableResources(manifest)) {
    declared.add(key)
    declared.add(`${key}CreateInput`)
    declared.add(`${key}UpdateInput`)
  }
  const local = (name: string): string =>
    declared.has(name) ? uniqueName(`Macts${name}`, declared) : name
  return { page: local('Page'), pageRequest: local('PageRequest') }
}

function uniqueName(base: string, used: Set<string>): string {
  let name = base
  for (let n = 2; used.has(name); n++) name = `${base}${String(n)}`
  used.add(name)
  return name
}

function reportDuplicates(
  names: readonly string[],
  scope: string,
  errors: string[],
  app: string
): void {
  const seen = new Set<string>()
  for (const name of names) {
    if (seen.has(name)) errors.push(`${app}: the name ${name} is declared twice in ${scope}.`)
    seen.add(name)
  }
}
