/**
 * Value kinds: the closed set of labels for the kind of a value read from an
 * app, and the kinds each declared manifest type expects.
 *
 * The nullability probe classifies every non-null value it reads into exactly
 * one {@link ValueKind} inside the automation process and returns only the
 * count per label, so a kind is a label, never a value. Comparing observed
 * kinds with the kinds a property's declared type expects shows a declared
 * type the app contradicts (a property declared `string` that holds dates,
 * say), which breaks decoding for every consumer of the generated surfaces.
 * The manifest uses the same labels for the kind evidence of an `unsupported`
 * marker (see `./schemas/evidence.ts`).
 *
 * The expected kinds are one table, {@link expectedValueKinds}, read the way
 * the contract generator reads a declared type: an absent type is a string,
 * and a named type is a resource reference or an enum depending on what the
 * name resolves to. A declared type with no expected kinds is not checked.
 *
 * @packageDocumentation
 */

import type { PrimitiveType, PropertyType } from './schemas/property.js'

/**
 * The labels for the kind of a non-null value read from an app, in the order
 * reports list them:
 *
 * - `date`: a `Date` (judged by its built-in tag, so a date from another
 *   realm qualifies).
 * - `number`, `boolean`, `string`: the primitive of that type.
 * - `record`: a plain keyed object.
 * - `list`: an array.
 * - `reference`: an app object specifier. The automation bridge represents
 *   one as a callable value, and no other property value is callable.
 * - `other`: anything else, e.g. a path object or a host object.
 *
 * @public
 */
export const VALUE_KINDS = [
  'date',
  'number',
  'boolean',
  'string',
  'record',
  'list',
  'reference',
  'other',
] as const

/**
 * The kind of one non-null value: a label from {@link VALUE_KINDS}.
 *
 * @public
 */
export type ValueKind = (typeof VALUE_KINDS)[number]

/**
 * How many values had each kind; absent kinds were not seen.
 *
 * @public
 */
export type ValueKindCounts = Readonly<Partial<Record<ValueKind, number>>>

/**
 * Whether a value is one of the {@link VALUE_KINDS} labels.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export function isValueKind(label: unknown): label is ValueKind {
  return typeof label === 'string' && (VALUE_KINDS as readonly string[]).includes(label)
}

/**
 * What a type name in a declared type names.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export type NamedTypeKind = 'resource' | 'enum'

/**
 * Resolves a type name to what it names, trying `preferred` first, as the
 * contract generator does: `{ resource: R }` tries resources first, and
 * `{ enum: E }` enums first. Returns `undefined` when the name names neither.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export type TypeNameResolver = (name: string, preferred: NamedTypeKind) => NamedTypeKind | undefined

/**
 * The kinds a value of each primitive declared type may have when read from
 * an app; `undefined` means the type is not checked.
 *
 * - `string` → `string`; `integer` and `number` → `number`;
 *   `boolean` → `boolean`; `date` → `date`.
 * - `point` and `rgb` → `list` or `record`: the native codec accepts a point
 *   as `[x, y]` or `{x, y}` and a color as three channels or a keyed record,
 *   so either form decodes.
 * - `rect` → `record`: the codec rejects a list as ambiguous between corner
 *   bounds and origin and size.
 * - Not checked: `file` and `data` (read as path or data objects) and `any`.
 */
const PRIMITIVE_VALUE_KINDS: Readonly<Record<PrimitiveType, readonly ValueKind[] | undefined>> = {
  string: ['string'],
  number: ['number'],
  integer: ['number'],
  boolean: ['boolean'],
  date: ['date'],
  point: ['list', 'record'],
  rgb: ['list', 'record'],
  rect: ['record'],
  file: undefined,
  data: undefined,
  any: undefined,
}

/**
 * The kinds of a named type's values: a resource is read as an object
 * specifier, and an enum value as its enumerator's name.
 */
const NAMED_VALUE_KINDS: Readonly<Record<NamedTypeKind, readonly ValueKind[]>> = {
  resource: ['reference'],
  enum: ['string'],
}

/**
 * The kinds a property's values may have, from its declared type, or
 * `undefined` when the type is not checked: `file`, `data`, `any`, a name that
 * names no resource or enum, or a list of such a type. An absent type is a
 * string, the manifest's default. A list (`{ array: X }`) expects `list`; its
 * items are not checked.
 *
 * @param type - The property's declared type.
 * @param resolve - Resolves type names to the manifest's resources and enums.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export function expectedValueKinds(
  type: PropertyType | undefined,
  resolve: TypeNameResolver
): readonly ValueKind[] | undefined {
  if (type === undefined) return ['string']
  if (typeof type === 'string') return PRIMITIVE_VALUE_KINDS[type]
  if ('array' in type) {
    return expectedValueKinds(type.array, resolve) === undefined ? undefined : ['list']
  }
  const named = 'resource' in type ? resolve(type.resource, 'resource') : resolve(type.enum, 'enum')
  return named === undefined ? undefined : NAMED_VALUE_KINDS[named]
}

/**
 * Every kind a property's values could be expected to have, whatever its
 * type names resolve to: {@link expectedValueKinds} with a named type taken
 * as a resource and as an enum. Used where the manifest's resources and enums
 * are not at hand (a property's own schema), so a check against it never
 * calls a kind unexpected that the resolved type would expect. `undefined`
 * when the type is not checked.
 *
 * @param type - The property's declared type.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export function possibleValueKinds(
  type: PropertyType | undefined
): readonly ValueKind[] | undefined {
  const asResource = expectedValueKinds(type, () => 'resource')
  const asEnum = expectedValueKinds(type, () => 'enum')
  if (asResource === undefined && asEnum === undefined) return undefined
  return VALUE_KINDS.filter(
    (kind) => (asResource?.includes(kind) ?? false) || (asEnum?.includes(kind) ?? false)
  )
}

/**
 * A declared type as reports show it: `string` for an absent type, the
 * primitive name, `list of <item>`, or the referenced resource or enum name.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export function describeDeclaredType(type: PropertyType | undefined): string {
  if (type === undefined) return 'string'
  if (typeof type === 'string') return type
  if ('array' in type) return `list of ${describeDeclaredType(type.array)}`
  if ('resource' in type) return type.resource
  return type.enum
}
