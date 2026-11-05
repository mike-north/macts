/**
 * Test support: the field lists a resource has in each generated public
 * surface, read structurally.
 *
 * Generated modules are parsed with the TypeScript compiler and their record
 * shapes read as syntax (interface members, the keys of a `t.record({...})` or
 * `z.object({...})` call, CLI options and the fields a CLI command passes or
 * prints), so a check over them asserts on the fields themselves, never on
 * text that merely mentions a name. Schemas produced as data (capability
 * input schemas, create inputs) are read as data.
 *
 * Each list is attributed to the resource whose fields it holds, and records
 * the names it may also carry from a source other than that resource's
 * properties (command parameters, parent identifiers, the canonical `id`
 * alias). A check that a property is absent from a surface skips exactly
 * those names.
 *
 * Used only by tests; not part of the package's public API.
 */

import * as ts from 'typescript'
import { PAGING_INPUT_NAMES } from '@macts/contracts'
import type { AppManifest } from '../../manifest/index.js'
import { CANONICAL_IDENTIFIER_KEY, resolvePrimaryIdentifierProperty } from '../../manifest/index.js'
import { deriveCapabilities } from '../../capabilities/registry.js'
import { CONTRACT_MODULE_PATH, generateContract } from '../contract/index.js'
import { generateCliPlugin } from '../cli/index.js'
import { createCliGeneratorContext } from '../cli/context.js'
import { generateHttpClientSdk } from '../sdk/http-client.js'
import { createInputFields, resourceCommandEntries, resourceNamespace } from '../surface.js'
import { lowerCamel } from '../../manifest/lower-camel.js'

/** The fields one resource has in one place of one generated surface. */
export interface FieldList {
  /** Where the fields were read, e.g. `contract interface NoteCreateInput`. */
  readonly surface: string
  /** The manifest key of the resource whose fields these are. */
  readonly resourceKey: string
  /** The field names, in the order the surface declares them. */
  readonly fields: readonly string[]
  /**
   * Names this list may carry from a source other than the resource's
   * properties: command parameters, parent identifiers, the canonical `id`.
   */
  readonly otherSources: ReadonlySet<string>
}

/** A property, marked unsupported, that a generated surface still exposes. */
export interface ExposedProperty {
  readonly surface: string
  readonly resourceKey: string
  readonly property: string
}

/** Every field list of every resource across the generated public surfaces. */
export function generatedFieldLists(manifest: AppManifest): FieldList[] {
  return [
    ...contractFieldLists(manifest),
    ...sdkFieldLists(manifest),
    ...capabilityFieldLists(manifest),
    ...createInputFieldLists(manifest),
    ...cliFieldLists(manifest),
  ]
}

/** Each resource's properties marked unsupported, by resource key. */
export function unsupportedProperties(manifest: AppManifest): Map<string, Set<string>> {
  const marked = new Map<string, Set<string>>()
  for (const [resourceKey, resource] of Object.entries(manifest.resources)) {
    const names = Object.entries(resource.properties)
      .filter(([, property]) => property.unsupported !== undefined)
      .map(([name]) => name)
    if (names.length > 0) marked.set(resourceKey, new Set(names))
  }
  return marked
}

/**
 * The properties marked unsupported that some generated surface exposes as a
 * field of their own resource: empty when every surface omits them.
 */
export function exposedUnsupportedProperties(manifest: AppManifest): ExposedProperty[] {
  return exposedProperties(generatedFieldLists(manifest), unsupportedProperties(manifest))
}

/**
 * The given properties, by resource key, that the field lists expose as a
 * field of their own resource.
 */
export function exposedProperties(
  lists: readonly FieldList[],
  marked: ReadonlyMap<string, ReadonlySet<string>>
): ExposedProperty[] {
  const exposed: ExposedProperty[] = []
  for (const list of lists) {
    const names = marked.get(list.resourceKey)
    if (names === undefined) continue
    for (const field of list.fields) {
      if (names.has(field) && !list.otherSources.has(field)) {
        exposed.push({ surface: list.surface, resourceKey: list.resourceKey, property: field })
      }
    }
  }
  return exposed
}

// ---------------------------------------------------------------------------
// Per-surface readers
// ---------------------------------------------------------------------------

/** The parameter names of every command that applies to a resource. */
function commandParameterNames(manifest: AppManifest, resourceKey: string): Set<string> {
  const names = new Set<string>()
  for (const [, command] of resourceCommandEntries(manifest, resourceKey)) {
    for (const parameter of command.parameters) names.add(parameter.name)
  }
  return names
}

/**
 * The contract: each resource's record interface and record value type, its
 * create and update input interfaces and value types, and the inline input of
 * every operation that targets it.
 */
function contractFieldLists(manifest: AppManifest): FieldList[] {
  const contract = generateContract(manifest)
  const content = contract.files.find((file) => file.path === CONTRACT_MODULE_PATH)?.content
  if (content === undefined) throw new Error('the generated contract has no contract module')
  const source = parse(CONTRACT_MODULE_PATH, content)
  const lists: FieldList[] = []
  for (const resourceKey of Object.keys(manifest.resources)) {
    const parameters = commandParameterNames(manifest, resourceKey)
    const none = new Set<string>()
    const push = (surface: string, fields: string[] | undefined, other: Set<string>): void => {
      if (fields !== undefined) lists.push({ surface, resourceKey, fields, otherSources: other })
    }
    push(`contract interface ${resourceKey}`, interfaceMembers(source, resourceKey), none)
    const record = `${lowerCamel(resourceKey)}RecordType`
    push(`contract ${record}`, factoryKeys(source, record), none)
    for (const suffix of ['CreateInput', 'UpdateInput']) {
      const name = `${resourceKey}${suffix}`
      push(`contract interface ${name}`, interfaceMembers(source, name), parameters)
      const binding = `${lowerCamel(resourceKey)}${suffix}Type`
      push(`contract ${binding}`, factoryKeys(source, binding), parameters)
    }
    for (const [operation, fields] of operationInputs(source, resourceKey)) {
      push(`contract ${operation} input`, fields, parameters)
    }
  }
  return lists
}

/** The legacy SDK: each resource's read type, its schema, and its create input type. */
function sdkFieldLists(manifest: AppManifest): FieldList[] {
  const sdk = generateHttpClientSdk(manifest, { packageName: 'sdk-fields' })
  const types = sdk.files.find((file) => file.path === 'src/types.ts')?.content
  if (types === undefined) throw new Error('the generated SDK has no src/types.ts')
  const source = parse('src/types.ts', types)
  const contractText = sdk.files.find((file) => file.path === CONTRACT_MODULE_PATH)?.content
  if (contractText === undefined) throw new Error('the facade has no canonical contract')
  const canonical = parse(CONTRACT_MODULE_PATH, contractText)
  const lists: FieldList[] = []
  for (const [resourceKey, resource] of Object.entries(manifest.resources)) {
    const read = new Set<string>()
    if (resolvePrimaryIdentifierProperty(resource) !== undefined) {
      read.add(CANONICAL_IDENTIFIER_KEY)
    }
    const parameters = commandParameterNames(manifest, resourceKey)
    const entries: [string, string[] | undefined, Set<string>][] = [
      [
        `SDK interface ${resourceKey}`,
        interfaceMembers(source, resourceKey) ?? interfaceMembers(canonical, resourceKey),
        read,
      ],
      [`SDK ${resourceKey}Schema`, factoryKeys(source, `${resourceKey}Schema`), read],
      [
        `SDK interface ${resourceKey}CreateInput`,
        interfaceMembers(source, `${resourceKey}CreateInput`) ??
          interfaceMembers(canonical, `${resourceKey}CreateInput`),
        parameters,
      ],
    ]
    for (const [surface, fields, otherSources] of entries) {
      if (fields !== undefined) lists.push({ surface, resourceKey, fields, otherSources })
    }
  }
  return lists
}

/** The capabilities: the input schema of each resource capability. */
function capabilityFieldLists(manifest: AppManifest): FieldList[] {
  const byAccessor = resourcesByAccessor(manifest)
  const lists: FieldList[] = []
  for (const capability of deriveCapabilities(manifest)) {
    for (const resourceKey of byAccessor.get(capability.resource) ?? []) {
      lists.push({
        surface: `capability ${capability.name} input schema`,
        resourceKey,
        fields: Object.keys(capability.inputSchema.properties ?? {}),
        otherSources: commandParameterNames(manifest, resourceKey),
      })
    }
  }
  return lists
}

/** The create input every surface shares. */
function createInputFieldLists(manifest: AppManifest): FieldList[] {
  return Object.keys(manifest.resources).map((resourceKey) => ({
    surface: `create input of ${resourceKey}`,
    resourceKey,
    fields: [...createInputFields(manifest, resourceKey).keys()],
    otherSources: commandParameterNames(manifest, resourceKey),
  }))
}

/**
 * The CLI plugin: in each command file, attributed to the resource whose SDK
 * client it calls, the options it declares and the fields it passes to the SDK
 * or prints.
 */
function cliFieldLists(manifest: AppManifest): FieldList[] {
  const options = { packageName: 'cli-fields', sdkPackageName: 'sdk-fields' }
  const cli = generateCliPlugin(manifest, options)
  const context = createCliGeneratorContext(manifest, options)
  // A paged list command's `--page-size` and `--cursor` options are the
  // paging inputs, which no resource property supplies.
  const otherSources = new Set<string>([
    CANONICAL_IDENTIFIER_KEY,
    'json',
    'message',
    ...PAGING_INPUT_NAMES,
  ])
  for (const path of context.getHierarchyPaths()) {
    for (const parent of path.parentParams) otherSources.add(parent.name)
  }
  for (const [resourceKey, resource] of Object.entries(manifest.resources)) {
    // The CLI names a resource's id option by lowering only its first letter.
    otherSources.add(`${resourceKey.charAt(0).toLowerCase()}${resourceKey.slice(1)}Id`)
    const identifier = resolvePrimaryIdentifierProperty(resource)
    if (identifier !== undefined) otherSources.add(identifier)
    for (const name of commandParameterNames(manifest, resourceKey)) otherSources.add(name)
  }
  const byAccessor = resourcesByAccessor(manifest)
  const lists: FieldList[] = []
  for (const file of cli.files) {
    if (!file.path.includes('commands/')) continue
    const source = parse(file.path, file.content)
    const fields = cliCommandFields(source)
    for (const accessor of fields.accessors) {
      for (const resourceKey of byAccessor.get(accessor) ?? []) {
        lists.push({
          surface: `CLI ${file.path}`,
          resourceKey,
          fields: fields.names,
          otherSources,
        })
      }
    }
  }
  return lists
}

/**
 * The resource keys behind each SDK client accessor: the resource's segment
 * (`resourceNamespace`), which is how the SDK, the CLI, and capabilities name
 * it.
 */
function resourcesByAccessor(manifest: AppManifest): Map<string, string[]> {
  const byAccessor = new Map<string, string[]>()
  for (const [resourceKey, resource] of Object.entries(manifest.resources)) {
    const accessor = resourceNamespace(resource)
    byAccessor.set(accessor, [...(byAccessor.get(accessor) ?? []), resourceKey])
  }
  return byAccessor
}

// ---------------------------------------------------------------------------
// Syntax readers
// ---------------------------------------------------------------------------

function parse(path: string, content: string): ts.SourceFile {
  return ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

/** The text of a property name: an identifier or a string literal key. */
function nameText(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text
  return undefined
}

/** The member names of a top-level `interface <name>`, or `undefined` when absent. */
function interfaceMembers(source: ts.SourceFile, name: string): string[] | undefined {
  for (const statement of source.statements) {
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === name) {
      return statement.members.flatMap((member) => {
        const text = member.name === undefined ? undefined : nameText(member.name)
        return text === undefined ? [] : [text]
      })
    }
  }
  return undefined
}

/** The keys of the first object literal argument of a call. */
function callObjectKeys(call: ts.CallExpression): string[] | undefined {
  const argument = call.arguments[0]
  if (argument === undefined || !ts.isObjectLiteralExpression(argument)) return undefined
  return argument.properties.flatMap((property) => {
    const text = property.name === undefined ? undefined : nameText(property.name)
    return text === undefined ? [] : [text]
  })
}

/**
 * The keys of the object passed to the factory call (`t.record({...})`,
 * `z.object({...})`) that initializes a top-level `const <name>`, or
 * `undefined` when there is no such binding.
 */
function factoryKeys(source: ts.SourceFile, name: string): string[] | undefined {
  for (const statement of source.statements) {
    const declaration = constDeclaration(statement, name)
    if (declaration?.initializer !== undefined && ts.isCallExpression(declaration.initializer)) {
      return callObjectKeys(declaration.initializer)
    }
  }
  return undefined
}

function constDeclaration(
  statement: ts.Statement,
  name: string
): ts.VariableDeclaration | undefined {
  if (!ts.isVariableStatement(statement)) return undefined
  return statement.declarationList.declarations.find(
    (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name
  )
}

/** A property of an object literal, by key. */
function objectProperty(
  object: ts.ObjectLiteralExpression,
  key: string
): ts.PropertyAssignment | undefined {
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) && nameText(property.name) === key) return property
  }
  return undefined
}

/**
 * The inline `t.record({...})` inputs of the operation descriptors whose
 * `target.resource` is the resource, by descriptor binding name.
 */
function operationInputs(source: ts.SourceFile, resourceKey: string): [string, string[]][] {
  const inputs: [string, string[]][] = []
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      const initializer = declaration.initializer
      if (initializer === undefined || !ts.isObjectLiteralExpression(initializer)) continue
      const target = objectProperty(initializer, 'target')?.initializer
      if (target === undefined || !ts.isObjectLiteralExpression(target)) continue
      const resource = objectProperty(target, 'resource')?.initializer
      if (resource === undefined || !ts.isStringLiteral(resource)) continue
      if (resource.text !== resourceKey) continue
      const input = objectProperty(initializer, 'input')?.initializer
      if (input === undefined || !ts.isCallExpression(input)) continue
      const keys = callObjectKeys(input)
      if (keys !== undefined) inputs.push([declaration.name.getText(source), keys])
    }
  }
  return inputs
}

/**
 * In a generated CLI command: the SDK client accessors it calls
 * (`client.<accessor>.<method>(…)`), and the field names it declares as
 * options (`name = Option.String(…)`) or passes or prints as an object field
 * read from an option or an item (`name: this.name`, `name: item.name`).
 */
function cliCommandFields(source: ts.SourceFile): { accessors: string[]; names: string[] } {
  const accessors = new Set<string>()
  const names: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'client'
    ) {
      accessors.add(node.expression.name.text)
    }
    if (
      ts.isPropertyDeclaration(node) &&
      node.initializer !== undefined &&
      ts.isCallExpression(node.initializer) &&
      ts.isPropertyAccessExpression(node.initializer.expression) &&
      ts.isIdentifier(node.initializer.expression.expression) &&
      node.initializer.expression.expression.text === 'Option'
    ) {
      const text = nameText(node.name)
      if (text !== undefined) names.push(text)
    }
    if (
      ts.isPropertyAssignment(node) &&
      ts.isPropertyAccessExpression(node.initializer) &&
      (node.initializer.expression.kind === ts.SyntaxKind.ThisKeyword ||
        (ts.isIdentifier(node.initializer.expression) &&
          node.initializer.expression.text === 'item'))
    ) {
      const text = nameText(node.name)
      if (text !== undefined) names.push(text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return { accessors: [...accessors], names }
}
