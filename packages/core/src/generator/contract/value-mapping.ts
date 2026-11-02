/**
 * Mapping from manifest types to value types, for generated app contracts.
 *
 * Every field, parameter, and result in a generated contract is described by a
 * value type composed from the `ValueTypes` constructors of `@macts/contracts`
 * (conventionally aliased `t`). This module decides which composition a
 * manifest type maps to, and renders it twice: as the constructor expression
 * (`t.array(t.date())`) and as the SDK type callers see (`readonly Date[]`).
 * It also builds the same composition in process, with the same constructors
 * ({@link ValueBuilder}), so the generator can derive data from the value type
 * the emitted expression will construct, such as its wire JSON Schema. All
 * three come from one {@link ValueShape}, so the expression, the declared
 * type, and the built value type cannot disagree.
 *
 * The mapping depends on position. File-like types (`file`, `data`) are
 * {@link FileValue}s where an operation returns them and file sources where an
 * operation consumes them; every other type maps the same way in both
 * positions.
 *
 * Type names that refer to resources or enums are resolved against the
 * manifest by normalized name (case-insensitive, ignoring spaces, dashes, and
 * underscores). A name that resolves to nothing maps to `t.unknown()`, and the
 * caller reports it as a diagnostic.
 *
 * @packageDocumentation
 */

import {
  ValueTypes as t,
  type ReferenceRegistry,
  type ValueType,
  type ValueTypeOptions,
} from '@macts/contracts'
import type { AppManifest } from '../../manifest/index.js'
import { normalizeTypeName } from '../../manifest/type-names.js'
import { usableResources } from '../../manifest/unsupported.js'
import type { DeclaredType } from '../surface.js'

/**
 * Where a value appears: in what an operation returns (records, results), or
 * in what it consumes (inputs, parameters).
 */
export type ValuePosition = 'output' | 'input'

/** The leaf value kinds, each one `ValueTypes` constructor. */
export type LeafKind =
  | 'string'
  | 'boolean'
  | 'integer'
  | 'double'
  | 'date'
  | 'point'
  | 'rectangle'
  | 'rgb'
  | 'file'
  | 'fileSource'
  | 'unknown'

/**
 * The composition a manifest type maps to, before rendering.
 *
 * @remarks
 * `enum` names the manifest enum key and `reference` the manifest resource
 * key, so rendering can refer to the generated enum type and record interface.
 */
export type ValueShape =
  | { readonly kind: LeafKind }
  | { readonly kind: 'enum'; readonly enumKey: string }
  | { readonly kind: 'array'; readonly item: ValueShape }
  | { readonly kind: 'reference'; readonly resourceKey: string }
  | { readonly kind: 'nullable'; readonly inner: ValueShape }

/**
 * `shape`, or `null`. Nullability is decided by the caller from manifest
 * evidence, never by the declared type, so it wraps an already mapped shape.
 *
 * @remarks
 * An `unknown` value already admits `null`, so it is returned unchanged
 * rather than wrapped; a shape that is already nullable is not wrapped twice.
 */
export function nullableShape(shape: ValueShape): ValueShape {
  if (shape.kind === 'unknown' || shape.kind === 'nullable') return shape
  return { kind: 'nullable', inner: shape }
}

/** The outcome of mapping one declared type. */
export interface MappedType {
  /** The composition the type maps to. */
  readonly shape: ValueShape
  /**
   * Whether every name in the type resolved. When `false`, the unresolved
   * part is `unknown` in {@link MappedType.shape}.
   */
  readonly resolved: boolean
}

/**
 * Resolves resource and enum names that manifest types refer to, to manifest
 * keys.
 */
export interface NameResolver {
  /**
   * The resource key a name refers to: matched against each usable resource's
   * key, `name`, and `plural`. A resource marked unsupported is on no
   * generated surface, so a name that refers to it resolves to none.
   */
  resource(name: string): string | undefined
  /** The enum key a name refers to: matched against each enum's key. */
  enumeration(name: string): string | undefined
}

/** Build the name resolver for a manifest. */
export function createNameResolver(manifest: AppManifest): NameResolver {
  const resources = new Map<string, string>()
  for (const [key, resource] of usableResources(manifest)) {
    for (const alias of [key, resource.name, resource.plural]) {
      const normalized = normalizeTypeName(alias)
      // The first declared resource wins an alias two resources share.
      if (!resources.has(normalized)) resources.set(normalized, key)
    }
  }
  const enums = new Map<string, string>()
  for (const key of Object.keys(manifest.enums)) {
    const normalized = normalizeTypeName(key)
    if (!enums.has(normalized)) enums.set(normalized, key)
  }
  return {
    resource: (name) => resources.get(normalizeTypeName(name)),
    enumeration: (name) => enums.get(normalizeTypeName(name)),
  }
}

/** The leaf kind of each primitive manifest type, by position. */
const PRIMITIVE_KINDS: Readonly<Record<string, Readonly<Record<ValuePosition, LeafKind>>>> = {
  string: { output: 'string', input: 'string' },
  boolean: { output: 'boolean', input: 'boolean' },
  integer: { output: 'integer', input: 'integer' },
  number: { output: 'double', input: 'double' },
  date: { output: 'date', input: 'date' },
  point: { output: 'point', input: 'point' },
  rect: { output: 'rectangle', input: 'rectangle' },
  rgb: { output: 'rgb', input: 'rgb' },
  file: { output: 'file', input: 'fileSource' },
  data: { output: 'file', input: 'fileSource' },
  any: { output: 'unknown', input: 'unknown' },
}

const UNRESOLVED: MappedType = { shape: { kind: 'unknown' }, resolved: false }

/**
 * Map a declared manifest type to its value composition at `position`.
 *
 * @remarks
 * - An absent type is a string, the manifest's default property type.
 * - `{ resource: R }` tries resources first, then enums; `{ enum: E }` tries
 *   enums first, then resources; a bare name tries enums, then resources.
 * - `{ array: X }` maps `X` at the same position.
 * - Anything else, including a record with no recognized key, is unresolved.
 */
export function mapDeclaredType(
  type: DeclaredType,
  position: ValuePosition,
  names: NameResolver
): MappedType {
  if (type === undefined) return { shape: { kind: 'string' }, resolved: true }
  return mapTypeValue(type, position, names)
}

/**
 * Map a type as it appears in manifest data. Parameter types are loosely
 * typed records (`Record<string, string>`), so the walk narrows the actual
 * value rather than trusting the declared shape.
 */
function mapTypeValue(type: unknown, position: ValuePosition, names: NameResolver): MappedType {
  if (typeof type === 'string') {
    const primitive = PRIMITIVE_KINDS[type]
    if (primitive !== undefined) return { shape: { kind: primitive[position] }, resolved: true }
    return byName(type, ['enum', 'resource'], names)
  }
  if (typeof type !== 'object' || type === null || Array.isArray(type)) return UNRESOLVED
  const keys = Object.keys(type)
  if (keys.length !== 1) return UNRESOLVED
  if ('array' in type) {
    const mapped = mapTypeValue(type.array, position, names)
    return { shape: { kind: 'array', item: mapped.shape }, resolved: mapped.resolved }
  }
  if ('resource' in type && typeof type.resource === 'string') {
    return byName(type.resource, ['resource', 'enum'], names)
  }
  if ('enum' in type && typeof type.enum === 'string') {
    return byName(type.enum, ['enum', 'resource'], names)
  }
  return UNRESOLVED
}

function byName(
  name: string,
  order: readonly ['enum' | 'resource', 'enum' | 'resource'],
  names: NameResolver
): MappedType {
  for (const kind of order) {
    if (kind === 'enum') {
      const enumKey = names.enumeration(name)
      if (enumKey !== undefined) return { shape: { kind: 'enum', enumKey }, resolved: true }
    } else {
      const resourceKey = names.resource(name)
      if (resourceKey !== undefined) {
        return { shape: { kind: 'reference', resourceKey }, resolved: true }
      }
    }
  }
  return UNRESOLVED
}

/**
 * The `@macts/contracts` type names that rendered SDK types can refer to. A
 * renderer records each one it uses, so the generated module imports exactly
 * those.
 */
export type ContractTypeName =
  | 'Integer'
  | 'Point'
  | 'Rectangle'
  | 'Rgb'
  | 'FileValue'
  | 'FileSource'
  | 'ObjectReferenceVariant'

/** What rendering needs to know about the generated module around it. */
export interface RenderContext {
  /** The binding of the enum's members tuple, e.g. `eventStatusMembers`. */
  enumMembers(enumKey: string): string
  /** The generated record interface of a resource. */
  recordInterface(resourceKey: string): string
  /**
   * The identifier composition of a resource, or `undefined` when the
   * resource has no identifier.
   */
  identifier(resourceKey: string): ValueShape | undefined
  /** The binding of the app's resource table, which references read lazily. */
  readonly resourcesBinding: string
}

/**
 * Renders value shapes as constructor expressions and SDK types, recording
 * which enum member tuples and contract types the output uses.
 */
export class ValueRenderer {
  readonly #context: RenderContext
  readonly #usedEnums = new Set<string>()
  readonly #usedTypes = new Set<ContractTypeName>()

  constructor(context: RenderContext) {
    this.#context = context
  }

  /** Enum keys whose member tuples rendered expressions refer to. */
  get usedEnums(): ReadonlySet<string> {
    return this.#usedEnums
  }

  /** Contract type names that rendered SDK types refer to. */
  get usedTypes(): ReadonlySet<ContractTypeName> {
    return this.#usedTypes
  }

  /**
   * The constructor expression of `shape`, e.g.
   * `t.array(t.date(), { description: 'Due dates' })`. A description, when
   * given, is attached to the outermost value type.
   */
  expression(shape: ValueShape, description?: string): string {
    const options =
      description === undefined ? '' : `{ description: ${stringLiteral(description)} }`
    const withOptions = (args: string): string =>
      options === '' ? args : args === '' ? options : `${args}, ${options}`
    switch (shape.kind) {
      case 'string':
      case 'boolean':
      case 'integer':
      case 'double':
      case 'date':
      case 'point':
      case 'rectangle':
      case 'rgb':
      case 'file':
      case 'fileSource':
      case 'unknown':
        return `t.${shape.kind}(${withOptions('')})`
      case 'enum':
        this.#usedEnums.add(shape.enumKey)
        return `t.enumeration(${withOptions(this.#context.enumMembers(shape.enumKey))})`
      case 'array':
        return `t.array(${withOptions(this.expression(shape.item))})`
      case 'nullable':
        return `t.nullable(${withOptions(this.expression(shape.inner))})`
      case 'reference': {
        const typeArgs = this.#referenceTypeArguments(shape.resourceKey)
        const args = `() => ${this.#context.resourcesBinding}, ${stringLiteral(shape.resourceKey)}, 'one'`
        return `t.reference<${typeArgs}>(${withOptions(args)})`
      }
    }
  }

  /** The SDK type of `shape`, e.g. `readonly Date[]`. */
  sdkType(shape: ValueShape): string {
    return this.#sdkType(shape, new Set())
  }

  #sdkType(shape: ValueShape, visiting: ReadonlySet<string>): string {
    switch (shape.kind) {
      case 'string':
      case 'boolean':
      case 'unknown':
        return shape.kind
      case 'double':
        return 'number'
      case 'date':
        return 'Date'
      case 'integer':
        return this.#use('Integer')
      case 'point':
        return this.#use('Point')
      case 'rectangle':
        return this.#use('Rectangle')
      case 'rgb':
        return this.#use('Rgb')
      case 'file':
        return this.#use('FileValue')
      case 'fileSource':
        return this.#use('FileSource')
      case 'enum':
        return shape.enumKey
      case 'array': {
        const item = this.#sdkType(shape.item, visiting)
        const grouped = item.startsWith('readonly ') || item.endsWith(' | null')
        return `readonly ${grouped ? `(${item})` : item}[]`
      }
      case 'nullable':
        return `${this.#sdkType(shape.inner, visiting)} | null`
      case 'reference':
        return `${this.#use('ObjectReferenceVariant')}<${this.#referenceTypeArguments(shape.resourceKey, visiting)}>`
    }
  }

  /**
   * `Record, Id` for a reference to `resourceKey`: its record interface and
   * the SDK type of its identifier (`never` when it has none, since such a
   * resource can be referenced only by selector).
   */
  #referenceTypeArguments(resourceKey: string, visiting: ReadonlySet<string> = new Set()): string {
    const record = this.#context.recordInterface(resourceKey)
    const identifier = this.#context.identifier(resourceKey)
    if (identifier === undefined) return `${record}, never`
    // An identifier that is itself a reference back to a resource on the
    // current path has no finite SDK type; describe it as `unknown`.
    if (visiting.has(resourceKey)) return `${record}, unknown`
    return `${record}, ${this.#sdkType(identifier, new Set([...visiting, resourceKey]))}`
  }

  #use(name: ContractTypeName): string {
    this.#usedTypes.add(name)
    return name
  }
}

/** What building needs to know about the contract around a value. */
export interface BuildContext {
  /** The members of an enum, in the order the generated tuple lists them. */
  enumMembers(enumKey: string): readonly string[]
  /**
   * The app's resource table as references read it: every resource the
   * generated table lists, in its order, with the identifier value type of
   * each one that has an identifier. Read lazily, as the generated table is.
   */
  registry(): ReferenceRegistry
}

/**
 * Builds value shapes into the value types their rendered constructor
 * expressions construct.
 *
 * @remarks
 * Each case mirrors {@link ValueRenderer.expression} exactly: the same
 * constructor, the same arguments, and the description on the outermost value
 * type. A built value type is therefore indistinguishable, in its wire schema
 * and so in its JSON Schema, from the one the generated module constructs.
 */
export class ValueBuilder {
  readonly #context: BuildContext

  constructor(context: BuildContext) {
    this.#context = context
  }

  /** The value type `shape` describes, with `description` on its outermost type. */
  build(shape: ValueShape, description?: string): ValueType<unknown> {
    const options: ValueTypeOptions | undefined =
      description === undefined ? undefined : { description }
    switch (shape.kind) {
      case 'string':
        return t.string(options)
      case 'boolean':
        return t.boolean(options)
      case 'integer':
        return t.integer(options)
      case 'double':
        return t.double(options)
      case 'date':
        return t.date(options)
      case 'point':
        return t.point(options)
      case 'rectangle':
        return t.rectangle(options)
      case 'rgb':
        return t.rgb(options)
      case 'file':
        return t.file(options)
      case 'fileSource':
        return t.fileSource(options)
      case 'unknown':
        return t.unknown(options)
      case 'enum': {
        const [first, ...rest] = this.#context.enumMembers(shape.enumKey)
        if (first === undefined) throw new Error(`Enum ${shape.enumKey} has no members.`)
        return t.enumeration([first, ...rest], options)
      }
      case 'array':
        return t.array(this.build(shape.item), options)
      case 'nullable':
        return t.nullable(this.build(shape.inner), options)
      case 'reference':
        return t.reference(() => this.#context.registry(), shape.resourceKey, 'one', options)
    }
  }
}

/**
 * A single-quoted TypeScript string literal for `value`, escaped so any text
 * (including quotes, backslashes, and line breaks) round-trips.
 */
export function stringLiteral(value: string): string {
  const escaped = JSON.stringify(value).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")
  return `'${escaped}'`
}
