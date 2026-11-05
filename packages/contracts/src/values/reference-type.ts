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
 * Every reference also names the app it belongs to, because resource keys
 * repeat across apps. The table and the app arrive together as the
 * {@link ReferenceScope}, which an app contract satisfies. The app is part of
 * the SDK data form only: encoding requires it at every level (the
 * reference, each container, and each entry) and rejects one that differs
 * from the scope's app, and it never writes it to the wire, where the route
 * already names the app. Decoding rejects an `app` key on the wire and stamps
 * the scope's app on everything it produces.
 *
 * The scope is supplied as a thunk because record types of mutually
 * referencing resources form cycles: a note record holds folder references
 * while a folder record holds note references. Constructing a reference value
 * type never calls the thunk; encoding, decoding, and schema use do.
 *
 * Encoding reads only the declared data fields of the reference's variant
 * (`resource`, `form`, `cardinality`, and `id`, `selector`, `entries`, or
 * `container`), following the strictness rule of `declared-fields`: function
 * members, prototype members, and private or non-enumerable state are
 * ignored, so a bound reference and a plain data descriptor encode alike and
 * `resolve` is never called, while any other own data property is rejected.
 * Decoding validates the strict wire form, rejecting unknown keys, and hands
 * the decoded
 * {@link ReferenceData} to `DecodeContext.bindReference`. Both directions
 * apply the same rules through one walker, so they cannot disagree:
 *
 * - `resource` and `cardinality` equal the declared ones, and every resource
 *   named (at the top level or in a container) is in the table;
 * - an identity form (a single reference, an identity-collection entry, or an
 *   identity container) names a resource that has an identifier; a resource
 *   without one can be referenced only by selector forms;
 * - identity-collection entries are single identity references to the
 *   collection's resource;
 * - selector positions are non-negative integers, and a range has
 *   `start <= end` (`start === end` is a valid empty range);
 * - a container is a single-object reference;
 * - a reference resolved through an operation that records a parent (the
 *   table entry's `parents` names one for that operation: `get` for a
 *   single-object reference, a container and an identity-collection entry;
 *   `list` for a selector collection) carries a container, and that container
 *   is an identity reference to the parent resource; the container is itself
 *   read by the same rules, so a chain of parents is checked level by level.
 *
 * Every resolvable object has its resolving operation: a single-object
 * reference, every container, and every identity-collection entry name a
 * resource with `get`, and a collection names a resource with `list`. An
 * operation that finds objects only within a parent can resolve a reference
 * only within that parent, so such references also need the parent's
 * identity container. Both directions check
 * it, and the wire and SDK schemas admit only the references that satisfy it,
 * so the JSON Schema of a position lists exactly the keys it accepts and
 * requires the container where one is needed. A caller-built reference that could never be resolved is rejected
 * before any call, a raw request carrying one is rejected by the wire schema,
 * and a returned one can only come from a defect of the contract.
 *
 * Issue paths follow the reference's own data layout (`app`, `id`,
 * `selector`, `entries/<i>`, `container`), which is the same in SDK and wire
 * form apart from `app`, so both directions report the same location. The `reference` control-record
 * envelope adds no path segment.
 *
 * This module is not part of the package's public surface.
 *
 * @packageDocumentation
 */

import { z, type ZodType } from 'zod'
import type { IssuePath } from '../issues.js'
import {
  resolvingOperationKey,
  type CollectionReferenceVariant,
  type IndexSelectorReference,
  type ObjectReferenceVariant,
  type ReferenceCardinality,
  type ReferenceData,
  type ReferenceForm,
  type ReferenceRegistry,
  type ReferenceScope,
  type ReferenceWire,
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
import {
  declaredFields,
  openSdkObject,
  type DeclaredFields,
  openWireObject,
  type FieldReader,
} from './declared-fields.js'
import { describeReceived, formatNumber, issue, quote } from './issue-helpers.js'
import { integerCodec } from './leaf-codecs.js'
import { integerSdkSchema, sdkObject } from './sdk-schemas.js'
import type { DecodeContext, ValueType } from './value-type.js'
import type { ValueTypeOptions } from './value-types.js'
import { wireIntegerSchema } from './wire-checks.js'
import type { WireValue } from './wire.js'

/** A lazy view of the app and its resource table; see the module documentation. */
export type ReferenceScopeThunk = () => ReferenceScope

/** What a reference position holds once bound, before the contract fixes `T` and `Id`. */
type BoundReference = ObjectReferenceVariant<unknown> | CollectionReferenceVariant<unknown>

/*
 * Reference shapes, generic over the representation of identifiers and
 * selector positions and over the app tag every level carries. Encoding
 * produces them with wire leaves and no tag (`Shape<WireValue, WireValue,
 * WireTag>`, a wire value); decoding produces them with SDK leaves and the app
 * (`Shape<unknown, Integer, AppTag>`, which is exactly `ReferenceData`). The
 * structure is the same in both directions; only the leaves and the tag
 * differ.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions -- type aliases, so the wire
   instantiation is assignable to `WireValue` */
type ObjectSelectorShape<Position> =
  | { readonly by: 'name'; readonly name: string }
  | { readonly by: 'index'; readonly index: Position }
type CollectionSelectorShape<Position> =
  | { readonly by: 'every' }
  | { readonly by: 'range'; readonly start: Position; readonly end: Position }
/** The app every data-form level carries. */
type AppTag = { readonly app: string }
/** The wire form carries no app: the route names it. */
type WireTag = Readonly<Record<never, never>>
type IdentityShape<Id, Position, Tag> = Tag & {
  readonly resource: string
  readonly form: 'identity'
  readonly cardinality: 'one'
  readonly id: Id
  readonly container?: ObjectShape<Id, Position, Tag>
}
type SelectorShape<Id, Position, Tag> = Tag & {
  readonly resource: string
  readonly form: 'selector'
  readonly cardinality: 'one'
  readonly selector: ObjectSelectorShape<Position>
  readonly container?: ObjectShape<Id, Position, Tag>
}
type ObjectShape<Id, Position, Tag> =
  | IdentityShape<Id, Position, Tag>
  | SelectorShape<Id, Position, Tag>
type CollectionShape<Id, Position, Tag> =
  | (Tag & {
      readonly resource: string
      readonly form: 'identity'
      readonly cardinality: 'many'
      readonly entries: readonly IdentityShape<Id, Position, Tag>[]
    })
  | (Tag & {
      readonly resource: string
      readonly form: 'selector'
      readonly cardinality: 'many'
      readonly selector: CollectionSelectorShape<Position>
      readonly container?: ObjectShape<Id, Position, Tag>
    })
type Shape<Id, Position, Tag> = ObjectShape<Id, Position, Tag> | CollectionShape<Id, Position, Tag>
/* eslint-enable @typescript-eslint/consistent-type-definitions */

/** The fields of an object being read; see `declared-fields`. */
type Source = FieldReader

/** A converted selector position: its numeric value, for ordering, and its converted form. */
interface Position<Converted> {
  readonly value: number
  readonly converted: Converted
}

/**
 * How one direction reads objects, converts identifiers and positions, and
 * handles the app each level belongs to.
 */
interface Direction<Id, Pos, Tag> {
  /** Open `value` as an object, or record why it is not one. */
  open(value: unknown, path: IssuePath, issues: Issues, expected: string): Source | Invalid
  /** The fields a variant declares in the form this direction reads. */
  fields(variant: VariantFields): DeclaredFields
  /**
   * The app tag of one level being read, given the scope: encoding checks the
   * level's `app` against the scope and produces no tag, decoding supplies
   * the scope's app.
   */
  tag(source: Source, path: IssuePath, scope: ReferenceScope, issues: Issues): Tag | Invalid
  /** Convert an identifier with its resource's identifier value type. */
  id(type: ValueType<unknown>, value: unknown, path: IssuePath, issues: Issues): Id | Invalid
  /** Convert a selector position. */
  position(value: unknown, path: IssuePath, issues: Issues): Position<Pos> | Invalid
  /** Past participle naming the direction in messages, for example "encoded". */
  readonly verb: string
}

/** Selector positions: zero-based, non-negative integers. */
const POSITION_CODEC = integerCodec(0, INTEGER_LIMITS.max)

/** The tag of a wire level: none. */
const NO_TAG: WireTag = Object.freeze({})

/**
 * Encoding: read the declared fields of any object by property access,
 * ignoring functions and non-own or non-enumerable properties, and rejecting
 * other own data properties.
 */
const ENCODING: Direction<WireValue, WireValue, WireTag> = {
  open: (value, path, issues, expected) =>
    openSdkObject(value) ?? mismatch(value, path, issues, expected),
  fields: (variant) => variant.sdk,
  tag(source, path, scope, issues) {
    const app = source.read('app')
    if (typeof app !== 'string') {
      return fieldMismatch(
        app,
        [...path, 'app'],
        issues,
        `the app the reference belongs to (${quote(scope.app)})`
      )
    }
    if (app !== scope.app) {
      issues.push(
        issue(
          [...path, 'app'],
          'invalid-type',
          `Expected a reference to an object of ${quote(scope.app)}; received a reference ` +
            `to an object of ${quote(app)}. A reference can be used only with the app it ` +
            'belongs to.'
        )
      )
      return INVALID
    }
    return NO_TAG
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
function decoding(context: DecodeContext): Direction<unknown, Integer, AppTag> {
  return {
    open: (value, path, issues, expected) =>
      openWireObject(value) ?? mismatch(value, path, issues, expected),
    fields: (variant) => variant.wire,
    // The wire form never carries the app; it is the scope's at every level.
    tag: (_source, _path, scope) => ({ app: scope.app }),
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

/** One pass of reading references: the app and its resource table, and the direction. */
interface Walk<Id, Pos, Tag> {
  readonly scope: ReferenceScope
  readonly direction: Direction<Id, Pos, Tag>
}

/**
 * A reference whose resource, form, and cardinality have been checked. An
 * identity-form header always carries its resource's identifier value type:
 * an identity reference to a resource without one is rejected while reading
 * the header.
 */
/**
 * The parent the operation resolving a reference finds its object or objects
 * within, which the reference's container must be an identity reference to.
 */
interface ParentScope {
  /** The parent resource key. */
  readonly resource: string
  /** The resolving operation that records it. */
  readonly operation: 'get' | 'list'
}

type Header<Tag> =
  | {
      readonly source: Source
      readonly tag: Tag
      readonly resource: string
      /** The parent of the operation resolving this reference, when it records one. */
      readonly parent: ParentScope | undefined
      readonly form: 'identity'
      /** The identifier value type of `resource`. */
      readonly idType: ValueType<unknown>
    }
  | {
      readonly source: Source
      readonly tag: Tag
      readonly resource: string
      /** The parent of the operation resolving this reference, when it records one. */
      readonly parent: ParentScope | undefined
      readonly form: 'selector'
    }

/** A header for an identity-form reference. */
type IdentityHeader<Tag> = Extract<Header<Tag>, { readonly form: 'identity' }>

const HEADER_FIELDS = ['resource', 'form', 'cardinality']
const ENTRIES_BELONG = 'entries belong to an identity collection (cardinality "many")'
const APP_NOT_ON_WIRE = "the route names the app, so a reference's wire form does not carry it"

/** The fields one reference variant declares in its SDK and its wire form. */
interface VariantFields {
  /** The SDK data form: the wire fields plus `app`. */
  readonly sdk: DeclaredFields
  /** The wire form, which never carries `app`. */
  readonly wire: DeclaredFields
}

/** Declare a reference variant's fields in both forms. */
function variantFields(
  label: string,
  fields: readonly string[],
  misplaced: Readonly<Record<string, string>>
): VariantFields {
  return Object.freeze({
    sdk: declaredFields(label, ['app', ...fields], misplaced),
    wire: declaredFields(label, fields, { ...misplaced, app: APP_NOT_ON_WIRE }),
  })
}

/* The declared fields of each reference variant. */
const IDENTITY_FIELDS = variantFields(
  'an identity reference',
  [...HEADER_FIELDS, 'id', 'container'],
  {
    selector: 'it denotes its object by its id, and a selector belongs to the selector form',
    entries: ENTRIES_BELONG,
  }
)
const SELECTOR_FIELDS = variantFields(
  'a selector reference',
  [...HEADER_FIELDS, 'selector', 'container'],
  {
    id: 'it denotes its object by its selector, and an id belongs to the identity form',
    entries: ENTRIES_BELONG,
  }
)
const IDENTITY_COLLECTION_FIELDS = variantFields(
  'an identity collection',
  [...HEADER_FIELDS, 'entries'],
  {
    selector: 'its members are its entries, and a selector belongs to the selector form',
    container: 'each entry carries its own container',
    id: 'each entry carries its own id',
  }
)
const SELECTOR_COLLECTION_FIELDS = variantFields(
  'a selector collection',
  [...HEADER_FIELDS, 'selector', 'container'],
  {
    id: 'its members are selected by its selector, and an id belongs to the identity form',
    entries: 'its members are selected by its selector, and entries belong to the identity form',
  }
)

/* The declared fields of each selection form. */
const BY_POSITION = 'it selects by position'
const NAME_SELECTOR_FIELDS = declaredFields('a "name" selector', ['by', 'name'], {
  index: 'it selects by name, not by position',
  start: 'it selects by name, not by position',
  end: 'it selects by name, not by position',
})
const INDEX_SELECTOR_FIELDS = declaredFields('an "index" selector', ['by', 'index'], {
  name: `${BY_POSITION}, not by name`,
  start: 'a single position is its index, and a range selects a collection',
  end: 'a single position is its index, and a range selects a collection',
})
const EVERY_SELECTOR_FIELDS = declaredFields('an "every" selector', ['by'], {
  name: 'it selects every object',
  index: 'it selects every object',
  start: 'it selects every object; a range selects some of them',
  end: 'it selects every object; a range selects some of them',
})
const RANGE_SELECTOR_FIELDS = declaredFields('a "range" selector', ['by', 'start', 'end'], {
  name: `${BY_POSITION}, not by name`,
  index: 'its positions are its start and end',
})

function readHeader<Id, Pos, Tag>(
  value: unknown,
  path: IssuePath,
  want: Want,
  walk: Walk<Id, Pos, Tag>,
  issues: Issues
): Header<Tag> | Invalid {
  const source = walk.direction.open(value, path, issues, expectedReference(want))
  if (source === INVALID) return INVALID
  const tag = walk.direction.tag(source, path, walk.scope, issues)

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
  const { resources } = walk.scope
  const entry = Object.hasOwn(resources, resource) ? resources[resource] : undefined
  if (entry === undefined) {
    issues.push(
      issue(
        path,
        'unsupported',
        `The app has no resource ${quote(resource)} that references can resolve through ` +
          `(one with a get or list operation), so a reference to it cannot be ` +
          `${walk.direction.verb}.`
      )
    )
    return INVALID
  }

  const cardinality = source.read('cardinality')
  if (cardinality !== want.cardinality) {
    issues.push(issue(path, 'invalid-type', cardinalityMessage(want, cardinality)))
    return INVALID
  }
  if (!resolvable(entry, want.role, want.cardinality)) {
    // A container or an entry is admitted by its resource, so the issue names
    // that field; a position's own reference fails as a whole.
    const at = want.role === 'reference' ? path : [...path, 'resource']
    issues.push(issue(at, 'unsupported', unresolvableMessage(resource, want)))
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
  if (tag === INVALID) return INVALID
  const parent = parentScope(entry, want.role, want.cardinality)
  if (form === 'selector') return { source, tag, resource, parent, form }
  if (entry.id === undefined) {
    issues.push(
      issue(
        path,
        'unsupported',
        `${quote(resource)} has no identifier, so it can be referenced only by a selector ` +
          '(name, index, every, or range).'
      )
    )
    return INVALID
  }
  return { source, tag, resource, parent, form, idType: entry.id }
}

/**
 * The operation that resolves an object at `role` with `cardinality`: every
 * resolvable object has one. A container and an identity-collection entry are
 * themselves resolvable single references, so they resolve through the
 * resource's `get`; a position's own reference resolves by its cardinality,
 * as {@link resolvingOperationKey} states.
 *
 * The walker checks it in both directions, and the wire and SDK schemas admit
 * only the resources it allows, so the codecs and the schemas (and the JSON
 * Schemas derived from them) cannot disagree about it.
 */
function resolvingOperation(role: Want['role'], cardinality: ReferenceCardinality): 'get' | 'list' {
  return resolvingOperationKey(role === 'reference' ? cardinality : 'one')
}

/** Whether a resource with table entry `entry` can be resolved at `role`; see {@link resolvingOperation}. */
function resolvable(
  entry: ReferenceRegistry[string] | undefined,
  role: Want['role'],
  cardinality: ReferenceCardinality
): boolean {
  return entry?.[resolvingOperation(role, cardinality)] !== undefined
}

/**
 * The parent the operation resolving a reference at `role` with `cardinality`
 * finds objects within, when the entry records one for it.
 */
function parentScope(
  entry: ReferenceRegistry[string] | undefined,
  role: Want['role'],
  cardinality: ReferenceCardinality
): ParentScope | undefined {
  const operation = resolvingOperation(role, cardinality)
  const resource = entry?.parents?.[operation]
  return resource === undefined ? undefined : { resource, operation }
}

/** The resources of `registry` that can be resolved at `role`, as a table of the same shape. */
function resolvableResources(
  registry: ReferenceRegistry,
  role: Want['role'],
  cardinality: ReferenceCardinality
): ReferenceRegistry {
  return Object.fromEntries(
    Object.entries(registry).filter(([, entry]) => resolvable(entry, role, cardinality))
  )
}

function unresolvableMessage(resource: string, want: Want): string {
  if (want.role === 'container') {
    return (
      `${quote(resource)} cannot be a container: the app has no operation that gets one ` +
      `${quote(resource)}, so the reference could never be resolved within it.`
    )
  }
  if (want.role === 'entry') {
    return (
      `An identity collection of ${quote(resource)} cannot list its entries: the app has no ` +
      `operation that gets one ${quote(resource)}, so an entry could never be resolved.`
    )
  }
  return want.cardinality === 'one'
    ? `The app has no operation that gets one ${quote(resource)}, so a reference to one cannot ` +
        'be resolved.'
    : `The app has no operation that lists ${quote(resource)} objects, so a collection of them ` +
        'cannot be resolved.'
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
function convertObject<Id, Pos, Tag>(
  value: unknown,
  path: IssuePath,
  want: Want,
  walk: Walk<Id, Pos, Tag>,
  issues: Issues
): ObjectShape<Id, Pos, Tag> | Invalid {
  const header = readHeader(value, path, want, walk, issues)
  if (header === INVALID) return INVALID
  return header.form === 'identity'
    ? identityBody(header, path, walk, issues)
    : selectorBody(header, path, walk, issues)
}

function identityBody<Id, Pos, Tag>(
  header: IdentityHeader<Tag>,
  path: IssuePath,
  walk: Walk<Id, Pos, Tag>,
  issues: Issues
): IdentityShape<Id, Pos, Tag> | Invalid {
  const { source, tag, resource } = header
  const raw = source.read('id')
  const id =
    raw === undefined
      ? fieldMismatch(raw, [...path, 'id'], issues, 'the object identifier')
      : walk.direction.id(header.idType, raw, [...path, 'id'], issues)
  const container = readContainer(header, path, walk, issues)
  const unknown = source.rejectUnknown(walk.direction.fields(IDENTITY_FIELDS), path, issues)
  if (id === INVALID || container === INVALID || unknown) return INVALID
  const base = { ...tag, resource, form: 'identity', cardinality: 'one', id } as const
  return container === undefined ? base : { ...base, container }
}

function selectorBody<Id, Pos, Tag>(
  header: Extract<Header<Tag>, { readonly form: 'selector' }>,
  path: IssuePath,
  walk: Walk<Id, Pos, Tag>,
  issues: Issues
): SelectorShape<Id, Pos, Tag> | Invalid {
  const { source, tag, resource } = header
  const selector = objectSelector(source.read('selector'), [...path, 'selector'], walk, issues)
  const container = readContainer(header, path, walk, issues)
  const unknown = source.rejectUnknown(walk.direction.fields(SELECTOR_FIELDS), path, issues)
  if (selector === INVALID || container === INVALID || unknown) return INVALID
  const base = { ...tag, resource, form: 'selector', cardinality: 'one', selector } as const
  return container === undefined ? base : { ...base, container }
}

/** Read a collection reference of either form. */
function convertCollection<Id, Pos, Tag>(
  value: unknown,
  path: IssuePath,
  want: Want,
  walk: Walk<Id, Pos, Tag>,
  issues: Issues
): CollectionShape<Id, Pos, Tag> | Invalid {
  const header = readHeader(value, path, want, walk, issues)
  if (header === INVALID) return INVALID
  const { source, tag, resource } = header

  if (header.form === 'identity') {
    const entries = readEntries(
      source.read('entries'),
      [...path, 'entries'],
      resource,
      walk,
      issues
    )
    const unknown = source.rejectUnknown(
      walk.direction.fields(IDENTITY_COLLECTION_FIELDS),
      path,
      issues
    )
    if (entries === INVALID || unknown) return INVALID
    return { ...tag, resource, form: 'identity', cardinality: 'many', entries }
  }

  const selector = collectionSelector(source.read('selector'), [...path, 'selector'], walk, issues)
  const container = readContainer(header, path, walk, issues)
  const unknown = source.rejectUnknown(
    walk.direction.fields(SELECTOR_COLLECTION_FIELDS),
    path,
    issues
  )
  if (selector === INVALID || container === INVALID || unknown) return INVALID
  const base = { ...tag, resource, form: 'selector', cardinality: 'many', selector } as const
  return container === undefined ? base : { ...base, container }
}

/**
 * Why a reference to `resource` needs an identity container of `parent`, as
 * the predicate of "the app …" the container messages share: the resolving
 * operation finds the object (`get`) or selects the objects (`list`) only
 * within one.
 */
function withinClause(resource: string, parent: ParentScope): string {
  return parent.operation === 'get'
    ? `finds each ${quote(resource)} only within its ${quote(parent.resource)}`
    : `lists ${quote(resource)} objects only within their ${quote(parent.resource)}`
}

/**
 * Read the container of the reference `header` heads: optional, and a
 * single-object reference, when the operation resolving it works at the
 * application; required, and an identity reference to the parent, when that
 * operation records one.
 */
function readContainer<Id, Pos, Tag>(
  header: Header<Tag>,
  path: IssuePath,
  walk: Walk<Id, Pos, Tag>,
  issues: Issues
): ObjectShape<Id, Pos, Tag> | undefined | Invalid {
  const { resource, parent } = header
  const at = [...path, 'container']
  const raw = header.source.read('container')
  if (raw === undefined) {
    if (parent === undefined) return undefined
    const what =
      parent.operation === 'get'
        ? `the ${quote(parent.resource)} the ${quote(resource)} is in`
        : `the ${quote(parent.resource)} whose ${quote(resource)} objects are selected`
    return fieldMismatch(
      raw,
      at,
      issues,
      `an identity reference to ${what}, because the app ${withinClause(resource, parent)}`
    )
  }
  const container = convertObject(
    raw,
    at,
    { resource: undefined, cardinality: 'one', form: undefined, role: 'container' },
    walk,
    issues
  )
  if (container === INVALID || parent === undefined) return container
  if (container.resource !== parent.resource || container.form !== 'identity') {
    const received =
      container.form === 'identity'
        ? `a reference to ${quote(container.resource)}`
        : `a selector reference to ${quote(container.resource)}`
    issues.push(
      issue(
        at,
        'invalid-type',
        `The app ${withinClause(resource, parent)}, by that ${quote(parent.resource)}'s ` +
          'identifier, so the container must be an identity reference to the resource ' +
          `${quote(parent.resource)}; received ${received}.`
      )
    )
    return INVALID
  }
  return container
}

function readEntries<Id, Pos, Tag>(
  raw: unknown,
  path: IssuePath,
  resource: string,
  walk: Walk<Id, Pos, Tag>,
  issues: Issues
): IdentityShape<Id, Pos, Tag>[] | Invalid {
  if (!Array.isArray(raw)) {
    return fieldMismatch(raw, path, issues, 'an array of identity references')
  }
  const items: readonly unknown[] = raw
  const want: Want = { resource, cardinality: 'one', form: 'identity', role: 'entry' }
  const entries: IdentityShape<Id, Pos, Tag>[] = []
  let valid = true
  for (const [index, item] of items.entries()) {
    const entryPath = [...path, index]
    const header = readHeader(item, entryPath, want, walk, issues)
    // `want.form` is identity, so a valid header is always an identity header.
    const entry =
      header === INVALID || header.form !== 'identity'
        ? INVALID
        : identityBody(header, entryPath, walk, issues)
    if (entry === INVALID) valid = false
    else entries.push(entry)
  }
  return valid ? entries : INVALID
}

function objectSelector<Id, Pos, Tag>(
  raw: unknown,
  path: IssuePath,
  walk: Walk<Id, Pos, Tag>,
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
      const unknown = source.rejectUnknown(NAME_SELECTOR_FIELDS, path, issues)
      if (typeof name !== 'string') {
        return fieldMismatch(name, [...path, 'name'], issues, 'the name to match (a string)')
      }
      return unknown ? INVALID : { by, name }
    }
    case 'index': {
      const index = readPosition(source, 'index', path, walk, issues)
      const unknown = source.rejectUnknown(INDEX_SELECTOR_FIELDS, path, issues)
      return index === INVALID || unknown ? INVALID : { by, index: index.converted }
    }
    default:
      return selectorKindIssue(by, path, issues, 'single-object', ['name', 'index'])
  }
}

function collectionSelector<Id, Pos, Tag>(
  raw: unknown,
  path: IssuePath,
  walk: Walk<Id, Pos, Tag>,
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
      return source.rejectUnknown(EVERY_SELECTOR_FIELDS, path, issues) ? INVALID : { by }
    case 'range': {
      const start = readPosition(source, 'start', path, walk, issues)
      const end = readPosition(source, 'end', path, walk, issues)
      const unknown = source.rejectUnknown(RANGE_SELECTOR_FIELDS, path, issues)
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

function readPosition<Id, Pos, Tag>(
  source: Source,
  key: string,
  path: IssuePath,
  walk: Walk<Id, Pos, Tag>,
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

/**
 * How a reference to one resource carries its container in a schema: when the
 * operation resolving it works at the application, any resolvable container,
 * optionally; when that operation records a parent, an identity reference to
 * the parent, required.
 */
interface ContainerSlot {
  readonly schema: ZodType
  readonly required: boolean
}

/** A union of `members`, which is `never` when there are none. */
function unionOf(members: readonly ZodType[], error: string): ZodType {
  const [first, second, ...rest] = members
  if (first === undefined) return z.never({ error })
  if (second === undefined) return first
  return z.union([first, second, ...rest])
}

/**
 * The schemas of the single-object references of one app, in one form (wire
 * or SDK), built lazily from its resource table so that containers, which
 * nest, and parents, which chain, are built once and never recurse while
 * being built.
 */
interface ObjectSchemas {
  /** How a reference to `resource` resolved through `operation` carries its container. */
  slot(resource: string, operation: 'get' | 'list'): ContainerSlot
  /** An identity reference to `resource`, which must have identifier type `id`. */
  identity(resource: string, id: ValueType<unknown>): ZodType
  /** A selector reference to `resource`. */
  selector(resource: string): ZodType
  /**
   * An index selector reference to `resource`, with the identity container of
   * the parent its `get` finds it within, required; nothing when its `get`
   * records no parent.
   */
  indexSelector(resource: string): ZodType
}

/** How one form spells the three object shapes; the rest of the construction is shared. */
interface SchemaForm {
  /** The schema of an identifier value in this form. */
  id(type: ValueType<unknown>): ZodType
  /** A reference object with the given fields; `app` is added in the SDK form. */
  object(fields: Readonly<Record<string, ZodType>>): ZodType
  /** The selector of a single-object reference. */
  readonly objectSelector: ZodType
  /** The selector of a single-object reference by position only. */
  readonly indexSelector: ZodType
  /** A field that may be absent. */
  optional(schema: ZodType): ZodType
}

/** The container field of a reference, as `slot` says it is carried. */
function containerField(form: SchemaForm, slot: ContainerSlot): ZodType {
  return slot.required ? slot.schema : form.optional(slot.schema)
}

function objectSchemas(registry: ReferenceRegistry, form: SchemaForm): ObjectSchemas {
  const containers = resolvableResources(registry, 'container', 'one')
  /**
   * Any container: a single-object reference to a resource that can be
   * resolved as a container (see {@link resolvingOperation}). Identity
   * branches exist only for those that also have an identifier. Resources
   * whose `get` works at the application share one selector branch; each whose
   * `get` records a parent has its own, which requires that parent.
   */
  const anyContainer: ZodType = z.lazy(() => {
    const keys = Object.keys(containers)
    const topLevel = keys.filter((key) => containers[key]?.parents?.get === undefined)
    const [first, ...rest] = topLevel
    const shared =
      first === undefined
        ? []
        : [
            form.object({
              resource: z.enum([first, ...rest]),
              form: z.literal('selector'),
              cardinality: z.literal('one'),
              selector: form.objectSelector,
              container: form.optional(anyContainer),
            }),
          ]
    return unionOf(
      [
        ...identified(containers).map(([key, id]) => self.identity(key, id)),
        ...shared,
        ...keys.filter((key) => !topLevel.includes(key)).map((key) => self.selector(key)),
      ],
      'The app has no resource that can contain a reference.'
    )
  })

  const self: ObjectSchemas = {
    slot(resource, operation) {
      const parent = Object.hasOwn(registry, resource)
        ? registry[resource]?.parents?.[operation]
        : undefined
      return parent === undefined
        ? { schema: anyContainer, required: false }
        : { schema: parentContainer(parent), required: true }
    },
    identity(resource, id) {
      return form.object({
        resource: z.literal(resource),
        form: z.literal('identity'),
        cardinality: z.literal('one'),
        id: form.id(id),
        container: containerField(form, self.slot(resource, 'get')),
      })
    },
    selector(resource) {
      return form.object({
        resource: z.literal(resource),
        form: z.literal('selector'),
        cardinality: z.literal('one'),
        selector: form.objectSelector,
        container: containerField(form, self.slot(resource, 'get')),
      })
    },
    indexSelector(resource) {
      const parent = Object.hasOwn(registry, resource)
        ? registry[resource]?.parents?.get
        : undefined
      if (parent === undefined) return z.never({ error: noPositionalParentMessage(resource) })
      return form.object({
        resource: z.literal(resource),
        form: z.literal('selector'),
        cardinality: z.literal('one'),
        selector: form.indexSelector,
        container: identityChain(parent),
      })
    },
  }

  /**
   * The container chain of an index selector within `parent`: an identity
   * reference to `parent`, whose container is required and is the same chain
   * of the parent its `get` records, and absent at a `parent` the app finds
   * at the application. Native resolution walks exactly that chain, so no
   * selector, and nothing above the top, is admitted.
   */
  function identityChain(parent: string): ZodType {
    return z.lazy(() => {
      const id = Object.hasOwn(containers, parent) ? containers[parent]?.id : undefined
      if (id === undefined) {
        return z.never({
          error: `The app cannot resolve an identity reference to ${quote(parent)}.`,
        })
      }
      const above = containers[parent]?.parents?.get
      return form.object({
        resource: z.literal(parent),
        form: z.literal('identity'),
        cardinality: z.literal('one'),
        id: form.id(id),
        ...(above === undefined ? {} : { container: identityChain(above) }),
      })
    })
  }

  /**
   * The container of a reference whose resolving operation finds objects
   * within `parent`: an identity reference to `parent`, which therefore needs
   * `get` and an identifier.
   */
  function parentContainer(parent: string): ZodType {
    return z.lazy(() => {
      const id = Object.hasOwn(containers, parent) ? containers[parent]?.id : undefined
      return id === undefined
        ? z.never({ error: `The app cannot resolve an identity reference to ${quote(parent)}.` })
        : self.identity(parent, id)
    })
  }

  return self
}

/** The wire form of reference objects: strict, with no `app`. */
const WIRE_FORM: SchemaForm = {
  id: (type) => type.wire,
  object: (fields) => z.strictObject(fields),
  objectSelector: WIRE_OBJECT_SELECTOR_SCHEMA,
  indexSelector: z.strictObject({ by: z.literal('index'), index: WIRE_POSITION_SCHEMA }),
  optional: (schema) => schema.exactOptional(),
}

/**
 * Wire schema of the payload of a reference to `resource` with `cardinality`.
 * It admits only what can be resolved (see {@link resolvingOperation}): a
 * position whose resource lacks its resolving operation admits nothing, an
 * identity collection admits entries only when its resource can be got, and
 * a reference whose resolving operation records a parent needs that parent's
 * identity container.
 */
function wirePayload(
  registry: ReferenceRegistry,
  resource: string,
  cardinality: ReferenceCardinality
): ZodType<ReferenceWire> {
  if (!Object.hasOwn(registry, resource)) {
    return z.never({
      error:
        `The app has no resource ${quote(resource)} that references can resolve through ` +
        '(one with a get or list operation).',
    })
  }
  const entry = registry[resource]
  if (!resolvable(entry, 'reference', cardinality)) {
    return z.never({
      error: unresolvableMessage(resource, unresolvableWant(resource, cardinality)),
    })
  }
  // The schemas of `ObjectSchemas` admit exactly the wire forms of references,
  // as the walker reads them.
  return referencePayload(registry, resource, cardinality, WIRE_FORM, {
    collectionSelector: WIRE_COLLECTION_SELECTOR_SCHEMA,
    entryError: unresolvableMessage(resource, entryWant(resource)),
  }) as ZodType<ReferenceWire>
}

/**
 * The payload schema of a reference to `resource` with `cardinality`, in
 * `form`, for a resource that can be resolved at that cardinality.
 */
function referencePayload(
  registry: ReferenceRegistry,
  resource: string,
  cardinality: ReferenceCardinality,
  form: SchemaForm,
  extra: { readonly collectionSelector: ZodType; readonly entryError: string }
): ZodType {
  const schemas = objectSchemas(registry, form)
  const entry = registry[resource]
  // A resource without an identifier has no identity forms; the selector
  // branch alone remains, so the union is never empty.
  const id = entry?.id
  if (cardinality === 'one') {
    const selector = schemas.selector(resource)
    return id === undefined ? selector : z.union([schemas.identity(resource, id), selector])
  }
  const selector = form.object({
    resource: z.literal(resource),
    form: z.literal('selector'),
    cardinality: z.literal('many'),
    selector: extra.collectionSelector,
    container: containerField(form, schemas.slot(resource, 'list')),
  })
  if (id === undefined) return selector
  // Entries are single references, so they need `get`; without it only an
  // empty identity collection is admitted, as the walker admits it.
  const member = resolvable(entry, 'entry', 'one')
    ? schemas.identity(resource, id)
    : z.never({ error: extra.entryError })
  return z.union([
    form.object({
      resource: z.literal(resource),
      form: z.literal('identity'),
      cardinality: z.literal('many'),
      entries: z.array(member),
    }),
    selector,
  ])
}

/** What a position's own reference to `resource` with `cardinality` must be, for messages. */
function unresolvableWant(resource: string, cardinality: ReferenceCardinality): Want {
  return { resource, cardinality, form: undefined, role: 'reference' }
}

/** What an identity-collection entry of `resource` must be, for messages. */
function entryWant(resource: string): Want {
  return { resource, cardinality: 'one', form: 'identity', role: 'entry' }
}

/*
 * SDK schemas. They accept the same structural data encoding accepts: declared
 * fields are validated (including `app`, which must be the scope's at every
 * level), function members (such as `resolve` on a bound reference) are
 * allowed, and any other own data property is rejected.
 */

/** SDK schema of a selector position: a non-negative integer. */
const SDK_POSITION_SCHEMA = integerSdkSchema(0, INTEGER_LIMITS.max)

/** SDK schema of a single-object selector. */
const SDK_OBJECT_SELECTOR_SCHEMA = z.discriminatedUnion('by', [
  sdkObject({ by: z.literal('name'), name: z.string() }),
  sdkObject({ by: z.literal('index'), index: SDK_POSITION_SCHEMA }),
])

/** SDK schema of a single-object selector by position only. */
const SDK_INDEX_SELECTOR_SCHEMA = sdkObject({ by: z.literal('index'), index: SDK_POSITION_SCHEMA })

/** SDK schema of a collection selector; a range must have `start <= end`. */
const SDK_COLLECTION_SELECTOR_SCHEMA = z.discriminatedUnion('by', [
  sdkObject({ by: z.literal('every') }),
  sdkObject({
    by: z.literal('range'),
    start: SDK_POSITION_SCHEMA,
    end: SDK_POSITION_SCHEMA,
  }).refine((range) => range.start <= range.end, {
    error: "A range's start must not exceed its end.",
  }),
])

/** The SDK form of reference objects for `app`: every level carries the app. */
function sdkForm(app: string): SchemaForm {
  return {
    id: (type) => type.sdk,
    object: (fields) => sdkObject({ app: z.literal(app), ...fields }),
    objectSelector: SDK_OBJECT_SELECTOR_SCHEMA,
    indexSelector: SDK_INDEX_SELECTOR_SCHEMA,
    optional: (schema) => schema.optional(),
  }
}

function sdkReference(
  scope: ReferenceScope,
  resource: string,
  cardinality: ReferenceCardinality
): ZodType {
  const { app, resources } = scope
  if (!Object.hasOwn(resources, resource)) return z.never()
  if (!resolvable(resources[resource], 'reference', cardinality)) return z.never()
  return referencePayload(resources, resource, cardinality, sdkForm(app), {
    collectionSelector: SDK_COLLECTION_SELECTOR_SCHEMA,
    entryError: unresolvableMessage(resource, entryWant(resource)),
  })
}

/** Every resource in the table that has an identifier, with its identifier value type. */
function identified(registry: ReferenceRegistry): [string, ValueType<unknown>][] {
  return Object.keys(registry).flatMap((key): [string, ValueType<unknown>][] => {
    const id = registry[key]?.id
    return id === undefined ? [] : [[key, id]]
  })
}

/**
 * Call the scope thunk and check that it returned an app and a resource
 * table. A thunk that returns something else (such as the bare resource
 * table) is a defect of the contract that built the value type, so it throws
 * rather than reporting an issue about the value.
 */
function readScope(scope: ReferenceScopeThunk): ReferenceScope {
  const value: unknown = scope()
  if (
    typeof value !== 'object' ||
    value === null ||
    !('app' in value) ||
    typeof value.app !== 'string' ||
    value.app === '' ||
    !('resources' in value) ||
    typeof value.resources !== 'object' ||
    value.resources === null
  ) {
    throw new TypeError(
      "t.reference(…) needs its scope function to return the app contract, with the app's " +
        `name and its resource table; received ${describeReceived(value)}.`
    )
  }
  // Checked above: a non-empty `app` string and a `resources` object, whose
  // entries the walker checks as it reads them.
  return value as ReferenceScope
}

/**
 * Build `t.reference(scope, resource, cardinality)`; see
 * `ValueTypeConstructors.reference`.
 *
 * @remarks
 * The record type `T` and identifier type `Id` are fixed by the generated
 * contract and are not observable at runtime; the overloads assign them. The
 * binder's result is the bound form of the decoded data, whose identifier was
 * decoded by the resource's own identifier value type.
 */
export function referenceType<T = unknown, Id = unknown, R extends string = string>(
  scope: ReferenceScopeThunk,
  resource: R,
  cardinality: 'one',
  options?: ValueTypeOptions
): ValueType<ObjectReferenceVariant<T, Id, R>>
export function referenceType<T = unknown, Id = unknown, R extends string = string>(
  scope: ReferenceScopeThunk,
  resource: R,
  cardinality: 'many',
  options?: ValueTypeOptions
): ValueType<CollectionReferenceVariant<T, Id, R>>
export function referenceType(
  scope: ReferenceScopeThunk,
  resource: string,
  // Wider than the overloads, so that a cardinality that bypassed the static
  // types is rejected rather than trusted.
  cardinality: string,
  options?: ValueTypeOptions
): ValueType<BoundReference> {
  if (typeof scope !== 'function') {
    throw new TypeError(
      `t.reference(…) needs a function returning the app contract; received ${describeReceived(scope)}.`
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
  const convert = <Id, Pos, Tag>(
    value: unknown,
    path: IssuePath,
    walk: Walk<Id, Pos, Tag>,
    issues: Issues
  ): Shape<Id, Pos, Tag> | Invalid =>
    cardinality === 'one'
      ? convertObject(value, path, want, walk, issues)
      : convertCollection(value, path, want, walk, issues)

  const codec: Codec<BoundReference> = {
    encode(value, path, issues) {
      const shape = convert(value, path, { scope: readScope(scope), direction: ENCODING }, issues)
      return shape === INVALID ? INVALID : { reference: shape }
    },
    decode(wire, path, context, issues) {
      const payload = controlPayload(wire, 'reference', path, issues, REFERENCE_EXAMPLE)
      if (payload === INVALID) return INVALID
      const data: ReferenceData | Invalid = convert(
        payload,
        path,
        { scope: readScope(scope), direction: decoding(context) },
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
      sdk: z.lazy(() =>
        sdkReference(readScope(scope), resource, cardinality)
      ) as ZodType<BoundReference>,
      wire: z.lazy(() =>
        z.strictObject({
          reference: wirePayload(readScope(scope).resources, resource, cardinality),
        })
      ),
      codec,
    },
    options?.description
  )
}

/**
 * Why `resource` has no index selector form within a container: its `get`
 * finds it at the application, so there is no container to count within.
 */
function noPositionalParentMessage(resource: string): string {
  return (
    `The app gets one ${quote(resource)} without a container, so no reference can denote one ` +
    'by its position within a container.'
  )
}

/**
 * The issue, if any, that keeps a converted reference from being an index
 * selector within its container ({@link indexSelectorReferenceType}): its
 * form and its selector. The container is checked while it is read, as the
 * parent of the resource's `get` (`readContainer`).
 */
function indexSelectorIssue(
  shape: ObjectShape<unknown, unknown, unknown>,
  path: IssuePath,
  registry: ReferenceRegistry,
  issues: Issues
): boolean {
  const { resource } = shape
  const position = `${quote(resource)} at this position is denoted by its zero-based position within its container`
  if (shape.form !== 'selector' || shape.selector.by !== 'index') {
    const received = shape.form === 'identity' ? 'an identity reference' : 'a selector by name'
    issues.push(
      issue(
        path,
        'invalid-type',
        `Expected an index selector: a reference to ${position}; received ${received}.`
      )
    )
    return true
  }
  if (registry[resource]?.parents?.get === undefined) {
    issues.push(issue(path, 'unsupported', noPositionalParentMessage(resource)))
    return true
  }
  return containerChainIssue(shape.container, [...path, 'container'], registry, issues)
}

/**
 * The issue, if any, with the container chain of an index selector. Each
 * level was checked, while it was read, to be the identity of the parent its
 * resource's `get` records; the chain must end at a level the app finds at
 * the application, with no container, where native resolution starts.
 */
function containerChainIssue(
  container: ObjectShape<unknown, unknown, unknown> | undefined,
  path: IssuePath,
  registry: ReferenceRegistry,
  issues: Issues
): boolean {
  let level = container
  let at = path
  while (level !== undefined && registry[level.resource]?.parents?.get !== undefined) {
    level = level.container
    at = [...at, 'container']
  }
  if (level?.container === undefined) return false
  issues.push(
    issue(
      [...at, 'container'],
      'unsupported',
      `The app finds ${quote(level.resource)} at the application, so the container chain of an index selector ends at it: it cannot have a container of its own.`
    )
  )
  return true
}

/**
 * Build `t.indexSelectorReference(scope, resource)`; see
 * `ValueTypeConstructors.indexSelectorReference`.
 *
 * @remarks
 * It reads a reference as `t.reference(scope, resource, 'one')` does, by the
 * same walker and with the same rules, and admits only the index selector
 * form within the identity container of the parent the resource's `get`
 * finds it within. Its plan records the form (`form: 'index'`), which the
 * native codec emits at the position.
 */
export function indexSelectorReferenceType<T = unknown, R extends string = string>(
  scope: ReferenceScopeThunk,
  resource: R,
  options?: ValueTypeOptions
): ValueType<IndexSelectorReference<T, R>> {
  if (typeof scope !== 'function') {
    throw new TypeError(
      `t.indexSelectorReference(…) needs a function returning the app contract; received ${describeReceived(scope)}.`
    )
  }
  if (typeof resource !== 'string' || resource === '') {
    throw new TypeError(
      `t.indexSelectorReference(…) needs a resource key; received ${describeReceived(resource)}.`
    )
  }

  const want: Want = { resource, cardinality: 'one', form: undefined, role: 'reference' }
  const convert = <Id, Pos, Tag>(
    value: unknown,
    path: IssuePath,
    walk: Walk<Id, Pos, Tag>,
    issues: Issues
  ): ObjectShape<Id, Pos, Tag> | Invalid => {
    const shape = convertObject(value, path, want, walk, issues)
    if (shape === INVALID) return INVALID
    return indexSelectorIssue(shape, path, walk.scope.resources, issues) ? INVALID : shape
  }

  const codec: Codec<IndexSelectorReference<T, R>> = {
    encode(value, path, issues) {
      const shape = convert(value, path, { scope: readScope(scope), direction: ENCODING }, issues)
      return shape === INVALID ? INVALID : { reference: shape }
    },
    decode(wire, path, context, issues) {
      const payload = controlPayload(wire, 'reference', path, issues, REFERENCE_EXAMPLE)
      if (payload === INVALID) return INVALID
      const data = convert(
        payload,
        path,
        { scope: readScope(scope), direction: decoding(context) },
        issues
      )
      // The checks above admit only an index selector within an identity
      // container, which is what the binder returns bound.
      return data === INVALID
        ? INVALID
        : (context.bindReference(data) as IndexSelectorReference<T, R>)
    },
  }

  return defineValueType(
    {
      plan: { kind: 'reference', resource, cardinality: 'one', form: 'index' },
      sdk: z.lazy(() => {
        const { app, resources } = readScope(scope)
        return Object.hasOwn(resources, resource) &&
          resolvable(resources[resource], 'reference', 'one')
          ? objectSchemas(resources, sdkForm(app)).indexSelector(resource)
          : z.never()
      }) as ZodType<IndexSelectorReference<T, R>>,
      wire: z.lazy(() => {
        const { resources } = readScope(scope)
        // The schemas of `ObjectSchemas` admit exactly the wire forms of
        // references, as the walker reads them.
        const payload = (
          Object.hasOwn(resources, resource) && resolvable(resources[resource], 'reference', 'one')
            ? objectSchemas(resources, WIRE_FORM).indexSelector(resource)
            : z.never({
                error: unresolvableMessage(resource, unresolvableWant(resource, 'one')),
              })
        ) as ZodType<ReferenceWire>
        return z.strictObject({ reference: payload })
      }),
      codec,
    },
    options?.description
  )
}
