/**
 * What a manifest's declared types mean as values: the composition each
 * declared type maps to (a leaf kind, an enum, an array, a reference to a
 * resource, or a nullable of one), before anything renders it.
 *
 * Which resource or enum a declared type names, and so which resource a
 * position references, is manifest knowledge. The contract generator renders
 * these compositions as value types, and the manifest-level judgments (which
 * input positions admit a value, which output positions can be resolved, and
 * what the nullability probe reads) ask the same mapping, so none of them can
 * disagree about what a type is.
 *
 * The mapping depends on position. File-like types (`file`, `data`) are files
 * where an operation returns them and file sources where an operation
 * consumes them; every other type maps the same way in both positions.
 *
 * Type names that refer to resources or enums are resolved against the
 * manifest by normalized name (case-insensitive, ignoring spaces, dashes, and
 * underscores, see `./type-names.ts`). A name that resolves to nothing maps to
 * `unknown`, and the caller reports it as a diagnostic.
 *
 * Internal to this package: nothing here is part of the public entry.
 */

import type { CommandParameter } from './schemas/command.js'
import type { AppManifest } from './schemas/app.js'
import type { PropertyType } from './schemas/property.js'
import { normalizeTypeName } from './type-names.js'
import { usableResources } from './unsupported.js'

/**
 * A type as a manifest declares it: a property type (absent means the
 * property has no declared type), or a command parameter type (a type name or
 * a flat reference record such as `{ resource: 'Calendar' }`).
 */
export type DeclaredType = CommandParameter['type'] | Exclude<PropertyType, string> | undefined

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
 * The shape that accepts what `shape` accepts and also `null`. Nullability is
 * decided by the caller from manifest evidence, never by the declared type,
 * so it wraps an already mapped shape.
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
