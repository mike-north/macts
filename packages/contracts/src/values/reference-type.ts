/**
 * Internal construction of reference value types, `t.reference(…)`.
 *
 * A reference position names one resource and one cardinality, and accepts
 * both forms of that cardinality. Identifiers are not self-describing on the
 * wire: a reference's `id`, and the `id` of each of its containers, is encoded
 * by its own resource's identifier value type, read from the app's resource
 * table (the {@link ReferenceRegistry}). Containers usually belong to other
 * resources, so the whole table is consulted, not only the declared resource.
 *
 * The table is supplied as a thunk because record types of mutually
 * referencing resources form cycles: a note record holds folder references
 * while a folder record holds note references. Constructing a reference value
 * type never calls the thunk; encoding, decoding, and schema use do.
 *
 * Encoding reads only a reference's data fields (`resource`, `form`,
 * `cardinality`, and `id`, `selector`, `entries`, or `container`) and ignores
 * every other property, so a bound reference and a plain data descriptor
 * encode alike and `resolve` is never called. Decoding validates the strict
 * wire form, rejecting unknown keys, and hands the decoded
 * {@link ReferenceData} to `DecodeContext.bindReference`. Both directions
 * apply the same rules through one walker, so they cannot disagree:
 *
 * - `resource` and `cardinality` equal the declared ones, and every resource
 *   named (at the top level or in a container) is in the table;
 * - identity-collection entries are single identity references to the
 *   collection's resource;
 * - selector positions are non-negative integers, and a range has
 *   `start <= end` (`start === end` is a valid empty range);
 * - a container is a single-object reference.
 *
 * Issue paths follow the reference's own data layout (`id`, `selector`,
 * `entries/<i>`, `container`), which is the same in SDK and wire form, so both
 * directions report the same location. The `reference` control-record
 * envelope adds no path segment.
 *
 * This module is not part of the package's public surface.
 *
 * @packageDocumentation
 */

import { z, type ZodType } from 'zod'
import type { IssuePath } from '../issues.js'
import type {
  CollectionReferenceVariant,
  ObjectReferenceVariant,
  ReferenceCardinality,
  ReferenceData,
  ReferenceForm,
  ReferenceRegistry,
  ReferenceWire,
} from '../references/index.js'
import {
  INVALID,
  codecOf,
  controlPayload,
  defineValueType,
  fieldMismatch,
  mismatch,
  type Codec,
  type Invalid,
  type Issues,
} from './codec.js'
import { INTEGER_LIMITS, type Integer } from './integer.js'
import { describeReceived, formatNumber, issue, isPlainObject, quote } from './issue-helpers.js'
import { integerCodec } from './leaf-codecs.js'
import { integerSdkSchema } from './sdk-schemas.js'
import type { DecodeContext, ValueType } from './value-type.js'
import type { ValueTypeOptions } from './value-types.js'
import { wireIntegerSchema } from './wire-checks.js'
import type { WireValue } from './wire.js'

/** A lazy view of the app's resource table; see the module documentation. */
export type ReferenceRegistryThunk = () => ReferenceRegistry

/** What a reference position holds once bound, before the contract fixes `T` and `Id`. */
type BoundReference =
  | ObjectReferenceVariant<unknown, unknown>
  | CollectionReferenceVariant<unknown, unknown>

/*
 * Reference shapes, generic over the representation of identifiers and
 * selector positions. Encoding produces them with wire leaves (`Shape<WireValue,
 * WireValue>`, a wire value); decoding produces them with SDK leaves
 * (`Shape<unknown, Integer>`, which is exactly `ReferenceData`). The structure
 * is the same in both directions; only the leaves differ.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions -- type aliases, so the wire instantiation is assignable to `WireValue` */
type ObjectSelectorShape<Position> =
  | { readonly by: 'name'; readonly name: string }
  | { readonly by: 'index'; readonly index: Position }
type CollectionSelectorShape<Position> =
  | { readonly by: 'every' }
  | { readonly by: 'range'; readonly start: Position; readonly end: Position }
type IdentityShape<Id, Position> = {
  readonly resource: string
  readonly form: 'identity'
  readonly cardinality: 'one'
  readonly id: Id
  readonly container?: ObjectShape<Id, Position>
}
type SelectorShape<Id, Position> = {
  readonly resource: string
  readonly form: 'selector'
  readonly cardinality: 'one'
  readonly selector: ObjectSelectorShape<Position>
  readonly container?: ObjectShape<Id, Position>
}
type ObjectShape<Id, Position> = IdentityShape<Id, Position> | SelectorShape<Id, Position>
type CollectionShape<Id, Position> =
  | {
      readonly resource: string
      readonly form: 'identity'
      readonly cardinality: 'many'
      readonly entries: readonly IdentityShape<Id, Position>[]
    }
  | {
      readonly resource: string
      readonly form: 'selector'
      readonly cardinality: 'many'
      readonly selector: CollectionSelectorShape<Position>
      readonly container?: ObjectShape<Id, Position>
    }
type Shape<Id, Position> = ObjectShape<Id, Position> | CollectionShape<Id, Position>
/* eslint-enable @typescript-eslint/consistent-type-definitions */

/** The fields of an object being read, by key. */
interface Source {
  /** The value of `key`, or `undefined` when it is absent. */
  read(key: string): unknown
  /**
   * Report every key outside `allowed` as an unknown field, when the
   * direction rejects unknown keys. Returns whether any was reported.
   */
  rejectUnknown(allowed: readonly string[], path: IssuePath, issues: Issues): boolean
}

/** A converted selector position: its numeric value, for ordering, and its converted form. */
interface Position<Converted> {
  readonly value: number
  readonly converted: Converted
}

/** How one direction reads objects and converts identifiers and positions. */
interface Direction<Id, Pos> {
  /** Open `value` as an object, or record why it is not one. */
  open(value: unknown, path: IssuePath, issues: Issues, expected: string): Source | Invalid
  /** Convert an identifier with its resource's identifier value type. */
  id(type: ValueType<unknown>, value: unknown, path: IssuePath, issues: Issues): Id | Invalid
  /** Convert a selector position. */
  position(value: unknown, path: IssuePath, issues: Issues): Position<Pos> | Invalid
  /** Past participle naming the direction in messages, for example "encoded". */
  readonly verb: string
}

/** Selector positions: zero-based, non-negative integers. */
const POSITION_CODEC = integerCodec(0, INTEGER_LIMITS.max)

/** Encoding: read the data fields of any object, ignoring every other property. */
const ENCODING: Direction<WireValue, WireValue> = {
  open(value, path, issues, expected) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return mismatch(value, path, issues, expected)
    }
    const source: object = value
    return {
      // Data fields may be accessors on a bound reference's prototype, so they
      // are read as properties rather than as own data.
      read: (key): unknown => Reflect.get(source, key),
      rejectUnknown: () => false,
    }
  },
  id: (type, value, path, issues) => codecOf(type).encode(value, path, issues),
  position(value, path, issues) {
    const wire = POSITION_CODEC.encode(value, path, issues)
    // The position codec accepts only numbers, so a success implies one.
    if (wire === INVALID || typeof value !== 'number') return INVALID
    return { value, converted: wire }
  },
  verb: 'encoded',
}

/** Decoding: read a strict JSON object, rejecting keys the wire form does not declare. */
function decoding(context: DecodeContext): Direction<unknown, Integer> {
  return {
    open(value, path, issues, expected) {
      if (!isPlainObject(value)) return mismatch(value, path, issues, expected)
      const source = value
      return {
        // JSON cannot carry `undefined`, so an absent key and an own
        // `undefined` (possible only in-process) both read as absent.
        read: (key) => (Object.hasOwn(source, key) ? source[key] : undefined),
        rejectUnknown(allowed, path, issues) {
          let found = false
          for (const key of Object.keys(source)) {
            if (allowed.includes(key)) continue
            found = true
            issues.push(
              issue(
                [...path, key],
                'unknown-field',
                `${quote(key)} is not a field of this reference wire form (its fields are ` +
                  `${allowed.map(quote).join(', ')}).`
              )
            )
          }
          return found
        },
      }
    },
    id: (type, value, path, issues) => codecOf(type).decode(value, path, context, issues),
    position(value, path, issues) {
      const integer = POSITION_CODEC.decode(value, path, context, issues)
      return integer === INVALID ? INVALID : { value: integer, converted: integer }
    },
    verb: 'decoded',
  }
}

/** What one reference being read must be. */
interface Want {
  /** The required resource; `undefined` admits any resource in the table (containers). */
  readonly resource: string | undefined
  /** The required cardinality. */
  readonly cardinality: ReferenceCardinality
  /** The required form; `undefined` admits either. */
  readonly form: ReferenceForm | undefined
  /** Where the reference sits, which shapes its messages. */
  readonly role: 'reference' | 'entry' | 'container'
}

/** One pass of reading references: the resource table and the direction. */
interface Walk<Id, Pos> {
  readonly registry: ReferenceRegistry
  readonly direction: Direction<Id, Pos>
}

/** A reference whose resource, form, and cardinality have been checked. */
interface Header {
  readonly source: Source
  readonly resource: string
  readonly form: ReferenceForm
  /** The identifier value type of `resource`. */
  readonly idType: ValueType<unknown>
}

const OBJECT_FIELDS = Object.freeze(['resource', 'form', 'cardinality'] as const)

function readHeader<Id, Pos>(
  value: unknown,
  path: IssuePath,
  want: Want,
  walk: Walk<Id, Pos>,
  issues: Issues
): Header | Invalid {
  const source = walk.direction.open(value, path, issues, expectedReference(want))
  if (source === INVALID) return INVALID

  const resource = source.read('resource')
  if (typeof resource !== 'string') {
    return fieldMismatch(resource, [...path, 'resource'], issues, 'a resource key (a string)')
  }
  if (want.resource !== undefined && resource !== want.resource) {
    issues.push(
      issue(
        path,
        'invalid-type',
        want.role === 'entry'
          ? `Every entry of an identity collection of ${quote(want.resource)} must reference ` +
              `${quote(want.resource)}; received a reference to ${quote(resource)}.`
          : `Expected a reference to ${quote(want.resource)}; received a reference to ${quote(resource)}.`
      )
    )
    return INVALID
  }
  const entry = Object.hasOwn(walk.registry, resource) ? walk.registry[resource] : undefined
  if (entry === undefined) {
    issues.push(
      issue(
        path,
        'unsupported',
        `The app has no resource ${quote(resource)}, so a reference to it cannot be ` +
          `${walk.direction.verb}: its identifier type is unknown.`
      )
    )
    return INVALID
  }

  const cardinality = source.read('cardinality')
  if (cardinality !== want.cardinality) {
    issues.push(issue(path, 'invalid-type', cardinalityMessage(want, cardinality)))
    return INVALID
  }

  const form = source.read('form')
  if (form !== 'identity' && form !== 'selector') {
    if (typeof form === 'string') {
      issues.push(
        issue(
          [...path, 'form'],
          'unknown-enum-member',
          `Expected the form "identity" or "selector"; received ${quote(form)}.`
        )
      )
      return INVALID
    }
    return fieldMismatch(form, [...path, 'form'], issues, 'the form "identity" or "selector"')
  }
  if (want.form !== undefined && form !== want.form) {
    issues.push(
      issue(
        path,
        'invalid-type',
        `Every entry of an identity collection must be a single identity reference; received a ` +
          `${form} reference.`
      )
    )
    return INVALID
  }
  return { source, resource, form, idType: entry.id }
}

function expectedReference(want: Want): string {
  switch (want.role) {
    case 'reference':
      return `a reference to ${quote(want.resource ?? '')}`
    case 'entry':
      return 'a single identity reference'
    case 'container':
      return 'a container reference'
  }
}

function cardinalityMessage(want: Want, received: unknown): string {
  const what =
    typeof received === 'string'
      ? `cardinality ${quote(received)}`
      : received === undefined
        ? 'no cardinality'
        : `cardinality ${describeReceived(received)}`
  switch (want.role) {
    case 'reference':
      return want.cardinality === 'one'
        ? `Expected a single-object reference (cardinality "one"); received ${what}.`
        : `Expected a collection reference (cardinality "many"); received ${what}.`
    case 'entry':
      return (
        'Every entry of an identity collection must be a single identity reference ' +
        `(cardinality "one"); received ${what}.`
      )
    case 'container':
      return `A container must be a single-object reference (cardinality "one"); received ${what}.`
  }
}

/** Read a single-object reference of either form. */
function convertObject<Id, Pos>(
  value: unknown,
  path: IssuePath,
  want: Want,
  walk: Walk<Id, Pos>,
  issues: Issues
): ObjectShape<Id, Pos> | Invalid {
  const header = readHeader(value, path, want, walk, issues)
  if (header === INVALID) return INVALID
  return header.form === 'identity'
    ? identityBody(header, path, walk, issues)
    : selectorBody(header, path, walk, issues)
}

function identityBody<Id, Pos>(
  header: Header,
  path: IssuePath,
  walk: Walk<Id, Pos>,
  issues: Issues
): IdentityShape<Id, Pos> | Invalid {
  const { source, resource } = header
  const raw = source.read('id')
  const id =
    raw === undefined
      ? fieldMismatch(raw, [...path, 'id'], issues, 'the object identifier')
      : walk.direction.id(header.idType, raw, [...path, 'id'], issues)
  const container = readContainer(source, path, walk, issues)
  const unknown = source.rejectUnknown([...OBJECT_FIELDS, 'id', 'container'], path, issues)
  if (id === INVALID || container === INVALID || unknown) return INVALID
  const base = { resource, form: 'identity', cardinality: 'one', id } as const
  return container === undefined ? base : { ...base, container }
}

function selectorBody<Id, Pos>(
  header: Header,
  path: IssuePath,
  walk: Walk<Id, Pos>,
  issues: Issues
): SelectorShape<Id, Pos> | Invalid {
  const { source, resource } = header
  const selector = objectSelector(source.read('selector'), [...path, 'selector'], walk, issues)
  const container = readContainer(source, path, walk, issues)
  const unknown = source.rejectUnknown([...OBJECT_FIELDS, 'selector', 'container'], path, issues)
  if (selector === INVALID || container === INVALID || unknown) return INVALID
  const base = { resource, form: 'selector', cardinality: 'one', selector } as const
  return container === undefined ? base : { ...base, container }
}

/** Read a collection reference of either form. */
function convertCollection<Id, Pos>(
  value: unknown,
  path: IssuePath,
  want: Want,
  walk: Walk<Id, Pos>,
  issues: Issues
): CollectionShape<Id, Pos> | Invalid {
  const header = readHeader(value, path, want, walk, issues)
  if (header === INVALID) return INVALID
  const { source, resource } = header

  if (header.form === 'identity') {
    const entries = readEntries(
      source.read('entries'),
      [...path, 'entries'],
      resource,
      walk,
      issues
    )
    const unknown = source.rejectUnknown([...OBJECT_FIELDS, 'entries'], path, issues)
    if (entries === INVALID || unknown) return INVALID
    return { resource, form: 'identity', cardinality: 'many', entries }
  }

  const selector = collectionSelector(source.read('selector'), [...path, 'selector'], walk, issues)
  const container = readContainer(source, path, walk, issues)
  const unknown = source.rejectUnknown([...OBJECT_FIELDS, 'selector', 'container'], path, issues)
  if (selector === INVALID || container === INVALID || unknown) return INVALID
  const base = { resource, form: 'selector', cardinality: 'many', selector } as const
  return container === undefined ? base : { ...base, container }
}

/** Read the optional container of a reference: absent, or a single-object reference. */
function readContainer<Id, Pos>(
  source: Source,
  path: IssuePath,
  walk: Walk<Id, Pos>,
  issues: Issues
): ObjectShape<Id, Pos> | undefined | Invalid {
  const raw = source.read('container')
  if (raw === undefined) return undefined
  return convertObject(
    raw,
    [...path, 'container'],
    { resource: undefined, cardinality: 'one', form: undefined, role: 'container' },
    walk,
    issues
  )
}

function readEntries<Id, Pos>(
  raw: unknown,
  path: IssuePath,
  resource: string,
  walk: Walk<Id, Pos>,
  issues: Issues
): IdentityShape<Id, Pos>[] | Invalid {
  if (!Array.isArray(raw)) {
    return fieldMismatch(raw, path, issues, 'an array of identity references')
  }
  const items: readonly unknown[] = raw
  const want: Want = { resource, cardinality: 'one', form: 'identity', role: 'entry' }
  const entries: IdentityShape<Id, Pos>[] = []
  let valid = true
  for (const [index, item] of items.entries()) {
    const entryPath = [...path, index]
    const header = readHeader(item, entryPath, want, walk, issues)
    const entry = header === INVALID ? INVALID : identityBody(header, entryPath, walk, issues)
    if (entry === INVALID) valid = false
    else entries.push(entry)
  }
  return valid ? entries : INVALID
}

function objectSelector<Id, Pos>(
  raw: unknown,
  path: IssuePath,
  walk: Walk<Id, Pos>,
  issues: Issues
): ObjectSelectorShape<Pos> | Invalid {
  if (raw === undefined) return fieldMismatch(raw, path, issues, 'a selector')
  const source = walk.direction.open(
    raw,
    path,
    issues,
    'a single-object selector, {by: "name", name} or {by: "index", index}'
  )
  if (source === INVALID) return INVALID
  const by = source.read('by')
  switch (by) {
    case 'name': {
      const name = source.read('name')
      const unknown = source.rejectUnknown(['by', 'name'], path, issues)
      if (typeof name !== 'string') {
        return fieldMismatch(name, [...path, 'name'], issues, 'the name to match (a string)')
      }
      return unknown ? INVALID : { by, name }
    }
    case 'index': {
      const index = readPosition(source, 'index', path, walk, issues)
      const unknown = source.rejectUnknown(['by', 'index'], path, issues)
      return index === INVALID || unknown ? INVALID : { by, index: index.converted }
    }
    default:
      return selectorKindIssue(by, path, issues, 'single-object', ['name', 'index'])
  }
}

function collectionSelector<Id, Pos>(
  raw: unknown,
  path: IssuePath,
  walk: Walk<Id, Pos>,
  issues: Issues
): CollectionSelectorShape<Pos> | Invalid {
  if (raw === undefined) return fieldMismatch(raw, path, issues, 'a selector')
  const source = walk.direction.open(
    raw,
    path,
    issues,
    'a collection selector, {by: "every"} or {by: "range", start, end}'
  )
  if (source === INVALID) return INVALID
  const by = source.read('by')
  switch (by) {
    case 'every':
      return source.rejectUnknown(['by'], path, issues) ? INVALID : { by }
    case 'range': {
      const start = readPosition(source, 'start', path, walk, issues)
      const end = readPosition(source, 'end', path, walk, issues)
      const unknown = source.rejectUnknown(['by', 'start', 'end'], path, issues)
      if (start === INVALID || end === INVALID) return INVALID
      if (start.value > end.value) {
        issues.push(
          issue(
            path,
            'out-of-range',
            `A range's start (${formatNumber(start.value)}) must not exceed its end ` +
              `(${formatNumber(end.value)}). Ranges are half-open, so a range whose start equals ` +
              'its end is valid and selects nothing.'
          )
        )
        return INVALID
      }
      return unknown ? INVALID : { by, start: start.converted, end: end.converted }
    }
    default:
      return selectorKindIssue(by, path, issues, 'collection', ['every', 'range'])
  }
}

function readPosition<Id, Pos>(
  source: Source,
  key: string,
  path: IssuePath,
  walk: Walk<Id, Pos>,
  issues: Issues
): Position<Pos> | Invalid {
  const raw = source.read(key)
  if (raw === undefined) {
    return fieldMismatch(raw, [...path, key], issues, 'a zero-based, non-negative integer position')
  }
  return walk.direction.position(raw, [...path, key], issues)
}

function selectorKindIssue(
  by: unknown,
  path: IssuePath,
  issues: Issues,
  kind: 'single-object' | 'collection',
  members: readonly [string, string]
): Invalid {
  const known = members.map(quote).join(' or ')
  if (typeof by !== 'string') {
    return fieldMismatch(by, [...path, 'by'], issues, `the selection form ${known}`)
  }
  const other =
    kind === 'single-object'
      ? by === 'every' || by === 'range'
        ? ` (${quote(by)} selects a collection)`
        : ''
      : by === 'name' || by === 'index'
        ? ` (${quote(by)} selects a single object)`
        : ''
  issues.push(
    issue(
      [...path, 'by'],
      'unknown-enum-member',
      `${quote(by)} is not a ${kind} selection form${other}; expected ${known}.`
    )
  )
  return INVALID
}

const REFERENCE_EXAMPLE = 'a reference control record, {"reference": {…}}'

/*
 * Wire schemas. The selector schemas are static; the payload schemas depend
 * on the resource table and are built (once, lazily) from it.
 */

/** Wire schema of a selector position: a non-negative integer control record. */
const WIRE_POSITION_SCHEMA = wireIntegerSchema(0, INTEGER_LIMITS.max)

/** Wire schema of a single-object selector. */
const WIRE_OBJECT_SELECTOR_SCHEMA = z.discriminatedUnion('by', [
  z.strictObject({ by: z.literal('name'), name: z.string() }),
  z.strictObject({ by: z.literal('index'), index: WIRE_POSITION_SCHEMA }),
])

/** Wire schema of a collection selector; a range must have `start <= end`. */
const WIRE_COLLECTION_SELECTOR_SCHEMA = z.discriminatedUnion('by', [
  z.strictObject({ by: z.literal('every') }),
  z
    .strictObject({
      by: z.literal('range'),
      start: WIRE_POSITION_SCHEMA,
      end: WIRE_POSITION_SCHEMA,
    })
    // Malformed bounds are reported by their own schemas; `NaN` compares false here.
    .refine((range) => !(Number(range.start.integer) > Number(range.end.integer)), {
      error: "A range's start must not exceed its end.",
    }),
])

function wireIdentity(
  resource: string,
  id: ZodType<WireValue>,
  container: ZodType<ReferenceWire>
): ZodType<ReferenceWire> {
  return z.strictObject({
    resource: z.literal(resource),
    form: z.literal('identity'),
    cardinality: z.literal('one'),
    id,
    container: container.exactOptional(),
  })
}

function wireSelector(
  resource: ZodType<string>,
  container: ZodType<ReferenceWire>
): ZodType<ReferenceWire> {
  return z.strictObject({
    resource,
    form: z.literal('selector'),
    cardinality: z.literal('one'),
    selector: WIRE_OBJECT_SELECTOR_SCHEMA,
    container: container.exactOptional(),
  })
}

/** Wire schema of a container: a single-object reference to any resource in the table. */
function wireContainer(registry: ReferenceRegistry): ZodType<ReferenceWire> {
  const schema: ZodType<ReferenceWire> = z.lazy(() => {
    const [first, ...rest] = Object.keys(registry)
    if (first === undefined)
      return z.never({ error: 'The app has no resources to contain a reference.' })
    return z.union([
      ...[first, ...rest].map((key) => wireIdentity(key, idOf(registry, key).wire, schema)),
      wireSelector(z.enum([first, ...rest]), schema),
    ])
  })
  return schema
}

/** Wire schema of the payload of a reference to `resource` with `cardinality`. */
function wirePayload(
  registry: ReferenceRegistry,
  resource: string,
  cardinality: ReferenceCardinality
): ZodType<ReferenceWire> {
  if (!Object.hasOwn(registry, resource)) {
    return z.never({ error: `The app has no resource ${quote(resource)}.` })
  }
  const container = wireContainer(registry)
  const identity = wireIdentity(resource, idOf(registry, resource).wire, container)
  if (cardinality === 'one')
    return z.union([identity, wireSelector(z.literal(resource), container)])
  return z.union([
    z.strictObject({
      resource: z.literal(resource),
      form: z.literal('identity'),
      cardinality: z.literal('many'),
      entries: z.array(identity),
    }),
    z.strictObject({
      resource: z.literal(resource),
      form: z.literal('selector'),
      cardinality: z.literal('many'),
      selector: WIRE_COLLECTION_SELECTOR_SCHEMA,
      container: container.exactOptional(),
    }),
  ])
}

/*
 * SDK schemas. They accept the same structural data encoding accepts: data
 * fields are validated and every other property (such as `resolve` on a bound
 * reference) is allowed, so objects are loose rather than strict.
 */

/** SDK schema of a selector position: a non-negative integer. */
const SDK_POSITION_SCHEMA = integerSdkSchema(0, INTEGER_LIMITS.max)

/** SDK schema of a single-object selector. */
const SDK_OBJECT_SELECTOR_SCHEMA = z.discriminatedUnion('by', [
  z.looseObject({ by: z.literal('name'), name: z.string() }),
  z.looseObject({ by: z.literal('index'), index: SDK_POSITION_SCHEMA }),
])

/** SDK schema of a collection selector; a range must have `start <= end`. */
const SDK_COLLECTION_SELECTOR_SCHEMA = z.discriminatedUnion('by', [
  z.looseObject({ by: z.literal('every') }),
  z
    .looseObject({ by: z.literal('range'), start: SDK_POSITION_SCHEMA, end: SDK_POSITION_SCHEMA })
    .refine((range) => range.start <= range.end, {
      error: "A range's start must not exceed its end.",
    }),
])

function sdkIdentity(resource: string, id: ZodType, container: ZodType): ZodType {
  return z.looseObject({
    resource: z.literal(resource),
    form: z.literal('identity'),
    cardinality: z.literal('one'),
    id,
    container: container.optional(),
  })
}

function sdkSelector(resource: ZodType<string>, container: ZodType): ZodType {
  return z.looseObject({
    resource,
    form: z.literal('selector'),
    cardinality: z.literal('one'),
    selector: SDK_OBJECT_SELECTOR_SCHEMA,
    container: container.optional(),
  })
}

function sdkContainer(registry: ReferenceRegistry): ZodType {
  const schema: ZodType = z.lazy(() => {
    const [first, ...rest] = Object.keys(registry)
    if (first === undefined) return z.never()
    return z.union([
      ...[first, ...rest].map((key) => sdkIdentity(key, idOf(registry, key).sdk, schema)),
      sdkSelector(z.enum([first, ...rest]), schema),
    ])
  })
  return schema
}

function sdkReference(
  registry: ReferenceRegistry,
  resource: string,
  cardinality: ReferenceCardinality
): ZodType {
  if (!Object.hasOwn(registry, resource)) return z.never()
  const container = sdkContainer(registry)
  const identity = sdkIdentity(resource, idOf(registry, resource).sdk, container)
  if (cardinality === 'one') return z.union([identity, sdkSelector(z.literal(resource), container)])
  return z.union([
    z.looseObject({
      resource: z.literal(resource),
      form: z.literal('identity'),
      cardinality: z.literal('many'),
      entries: z.array(identity),
    }),
    z.looseObject({
      resource: z.literal(resource),
      form: z.literal('selector'),
      cardinality: z.literal('many'),
      selector: SDK_COLLECTION_SELECTOR_SCHEMA,
      container: container.optional(),
    }),
  ])
}

/** The identifier value type of a resource known to be in the table. */
function idOf(registry: ReferenceRegistry, resource: string): ValueType<unknown> {
  const entry = registry[resource]
  if (entry === undefined) throw new TypeError(`The app has no resource ${quote(resource)}.`)
  return entry.id
}

/**
 * Build `t.reference(registry, resource, cardinality)`; see
 * `ValueTypeConstructors.reference`.
 *
 * @remarks
 * The record type `T` and identifier type `Id` are fixed by the generated
 * contract and are not observable at runtime; the overloads assign them. The
 * binder's result is the bound form of the decoded data, whose identifier was
 * decoded by the resource's own identifier value type.
 */
export function referenceType<T = unknown, Id = unknown>(
  registry: ReferenceRegistryThunk,
  resource: string,
  cardinality: 'one',
  options?: ValueTypeOptions
): ValueType<ObjectReferenceVariant<T, Id>>
export function referenceType<T = unknown, Id = unknown>(
  registry: ReferenceRegistryThunk,
  resource: string,
  cardinality: 'many',
  options?: ValueTypeOptions
): ValueType<CollectionReferenceVariant<T, Id>>
export function referenceType(
  registry: ReferenceRegistryThunk,
  resource: string,
  // Wider than the overloads, so that a cardinality that bypassed the static
  // types is rejected rather than trusted.
  cardinality: string,
  options?: ValueTypeOptions
): ValueType<BoundReference> {
  if (typeof registry !== 'function') {
    throw new TypeError(
      `t.reference(…) needs a function returning the app's resource table; received ${describeReceived(registry)}.`
    )
  }
  if (typeof resource !== 'string' || resource === '') {
    throw new TypeError(
      `t.reference(…) needs a resource key; received ${describeReceived(resource)}.`
    )
  }
  if (cardinality !== 'one' && cardinality !== 'many') {
    throw new TypeError(
      `t.reference(…) needs the cardinality "one" or "many"; received ${describeReceived(cardinality)}.`
    )
  }

  const want: Want = { resource, cardinality, form: undefined, role: 'reference' }
  const convert = <Id, Pos>(
    value: unknown,
    path: IssuePath,
    walk: Walk<Id, Pos>,
    issues: Issues
  ): Shape<Id, Pos> | Invalid =>
    cardinality === 'one'
      ? convertObject(value, path, want, walk, issues)
      : convertCollection(value, path, want, walk, issues)

  const codec: Codec<BoundReference> = {
    encode(value, path, issues) {
      const shape = convert(value, path, { registry: registry(), direction: ENCODING }, issues)
      return shape === INVALID ? INVALID : { reference: shape }
    },
    decode(wire, path, context, issues) {
      const payload = controlPayload(wire, 'reference', path, issues, REFERENCE_EXAMPLE)
      if (payload === INVALID) return INVALID
      const data: ReferenceData | Invalid = convert(
        payload,
        path,
        { registry: registry(), direction: decoding(context) },
        issues
      )
      return data === INVALID ? INVALID : context.bindReference(data)
    },
  }

  return defineValueType(
    {
      plan: { kind: 'reference', resource, cardinality },
      // The SDK schema validates the data fields that encoding reads. A bound
      // reference's `resolve` is the binder's, never validated or called here,
      // so the schema's output is asserted to be the bound type it accepts.
      sdk: z.lazy(() => sdkReference(registry(), resource, cardinality)) as ZodType<BoundReference>,
      wire: z.lazy(() =>
        z.strictObject({ reference: wirePayload(registry(), resource, cardinality) })
      ),
      codec,
    },
    options?.description
  )
}
