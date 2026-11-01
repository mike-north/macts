/**
 * Type tests for the reference hierarchy.
 *
 * Cardinality fixes the hydrated result type independently of form: single
 * references resolve to one record, collections to an array, and a
 * materialized list is an array of single references, not itself resolvable.
 * On the wire, the form and cardinality pair discriminates every variant.
 * Every bound reference is its data form plus `Resolvable`, so each bound kind
 * is assignable to its data kind (and so is valid encode input), while plain
 * data is not resolvable.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  AnyReference,
  AppContract,
  CallOptions,
  CollectionReference,
  CollectionReferenceData,
  CollectionReferenceVariant,
  IdentityCollectionReferenceData,
  IdentityReferenceData,
  ObjectReferenceData,
  ObjectReferenceVariant,
  ReferenceData,
  ReferenceRegistry,
  SelectorCollectionReferenceData,
  SelectorReferenceData,
  ValueType,
  CollectionSelector,
  CollectionSelectorWire,
  IndexSelector,
  Integer,
  ObjectSelector,
  ObjectSelectorWire,
  ReferenceWire,
  WireValue,
  IdentityCollectionReference,
  IdentityReference,
  ObjectReference,
  ReferenceList,
  Resolvable,
  SelectorCollectionReference,
  SelectorReference,
} from '../index.js'

interface Event {
  readonly title: string
}

declare const byId: IdentityReference<Event>
declare const byName: SelectorReference<Event>
declare const explicitSet: IdentityCollectionReference<Event>
declare const allEvents: SelectorCollectionReference<Event>
declare const listed: ReferenceList<IdentityReference<Event>>

// Single references resolve to one record, whatever their form.
expectType<Promise<Event>>(byId.resolve())
expectType<Promise<Event>>(byName.resolve())

// Collection references resolve to arrays, whatever their form.
expectType<Promise<readonly Event[]>>(explicitSet.resolve())
expectType<Promise<readonly Event[]>>(allEvents.resolve())

// Cardinality-aware consumers accept either form of the same cardinality.
expectAssignable<ObjectReference<Event>>(byId)
expectAssignable<ObjectReference<Event>>(byName)
expectAssignable<CollectionReference<Event>>(explicitSet)
expectAssignable<CollectionReference<Event>>(allEvents)

// Negative: cardinalities do not substitute for one another.
expectNotAssignable<ObjectReference<Event>>(allEvents)
expectNotAssignable<CollectionReference<Event>>(byId)

// Broad consumers accept any reference without inspecting it.
expectAssignable<Resolvable<unknown>>(byId)
expectAssignable<Resolvable<unknown>>(allEvents)
expectAssignable<AnyReference<Event>>(byName)

// A materialized list is an array of single references, not a resolvable.
expectType<IdentityReference<Event> | undefined>(listed[0])
expectNotAssignable<Resolvable<unknown>>(listed)

// Form narrows to the concrete variant.
declare const single: IdentityReference<Event> | SelectorReference<Event>
if (single.form === 'identity') {
  expectType<string>(single.id)
} else {
  expectType<'name' | 'index'>(single.selector.by)
}

// Edge: identifier types are carried through.
declare const numericId: IdentityReference<Event, number>
expectType<number>(numericId.id)

// Resolution accepts the shared call options.
expectType<CallOptions>(null as unknown as NonNullable<Parameters<typeof byId.resolve>[0]>)

// Index selection takes a branded integer, never a plain number.
declare const position: Integer
expectAssignable<IndexSelector>({ by: 'index', index: position })
expectNotAssignable<IndexSelector>({ by: 'index', index: 0 })
expectNotAssignable<ObjectSelector>({ by: 'index', index: 2 })

// Wire form: form × cardinality narrows to exactly one variant.
declare const wire: ReferenceWire
if (wire.form === 'identity') {
  if (wire.cardinality === 'one') {
    expectType<WireValue>(wire.id)
    expectType<ReferenceWire | undefined>(wire.container)
  } else {
    expectType<readonly ReferenceWire[]>(wire.entries)
  }
} else if (wire.cardinality === 'one') {
  expectType<ObjectSelectorWire>(wire.selector)
  expectType<ReferenceWire | undefined>(wire.container)
} else {
  expectType<CollectionSelectorWire>(wire.selector)
  expectType<ReferenceWire | undefined>(wire.container)
}

// Negative: an identity collection lists its entries; it has no selector.
expectNotAssignable<ReferenceWire>({
  resource: 'events',
  form: 'identity',
  cardinality: 'many',
  entries: [],
  selector: { by: 'every' },
})
expectNotAssignable<ReferenceWire>({
  resource: 'events',
  form: 'identity',
  cardinality: 'many',
  selector: { by: 'every' },
})

// Negative: selectors do not cross cardinalities, and wire indexes are wrapped.
expectNotAssignable<ReferenceWire>({
  resource: 'events',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'every' },
})
expectNotAssignable<ReferenceWire>({
  resource: 'events',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'index', index: 0 },
})

// Edge: containers nest, and a container may be of any form.
expectAssignable<ReferenceWire>({
  resource: 'events',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'range', start: { integer: '0' }, end: { integer: '10' } },
  container: {
    resource: 'calendars',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'name', name: 'Home' },
    container: {
      resource: 'accounts',
      form: 'identity',
      cardinality: 'one',
      id: 'A1',
    },
  },
})

// Bound references are assignable to their data forms, kind by kind.
expectAssignable<IdentityReferenceData<string>>(byId)
expectAssignable<SelectorReferenceData>(byName)
expectAssignable<IdentityCollectionReferenceData<string>>(explicitSet)
expectAssignable<SelectorCollectionReferenceData>(allEvents)
expectAssignable<ObjectReferenceData>(byId)
expectAssignable<CollectionReferenceData>(allEvents)
expectAssignable<ReferenceData>(explicitSet)
expectAssignable<ReferenceData>(numericId)

// Negative: data forms are not resolvable, and kinds do not substitute.
declare const identityData: IdentityReferenceData<string>
declare const selectorCollectionData: SelectorCollectionReferenceData
expectNotAssignable<IdentityReference<Event>>(identityData)
expectNotAssignable<Resolvable<unknown>>(identityData)
expectNotAssignable<IdentityReferenceData<number>>(byId)
expectNotAssignable<ObjectReferenceData>(selectorCollectionData)
expectNotAssignable<SelectorCollectionReferenceData>(explicitSet)

// Data forms carry SDK leaves: identifiers in their SDK type, positions as Integer.
declare const defaultId: IdentityReferenceData['id']
expectType<unknown>(defaultId)
expectType<CollectionSelector>(selectorCollectionData.selector)
expectAssignable<SelectorReferenceData>({
  resource: 'events',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'index', index: position },
  container: { resource: 'calendars', form: 'identity', cardinality: 'one', id: 7 },
})
expectNotAssignable<SelectorReferenceData>({
  resource: 'events',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'index', index: { integer: '0' } },
})
// Negative: an identity collection's data has no container; its entries carry their own.
expectNotAssignable<IdentityCollectionReferenceData>({
  resource: 'events',
  form: 'identity',
  cardinality: 'many',
  entries: [],
  container: { resource: 'calendars', form: 'identity', cardinality: 'one', id: 'C1' },
})

// Bound containers are bound references, of either form, and are valid data.
expectType<ObjectReferenceVariant<unknown, unknown> | undefined>(byId.container)
expectType<ObjectReferenceVariant<unknown, unknown> | undefined>(allEvents.container)
expectAssignable<ObjectReferenceData | undefined>(byName.container)

// A typed position holds either form of its cardinality, and narrows on form.
declare const atPosition: ObjectReferenceVariant<Event, number>
expectAssignable<ObjectReference<Event>>(atPosition)
if (atPosition.form === 'identity') {
  expectType<number>(atPosition.id)
} else {
  expectType<ObjectSelector>(atPosition.selector)
}
declare const collectionAtPosition: CollectionReferenceVariant<Event>
expectType<Promise<readonly Event[]>>(collectionAtPosition.resolve())
if (collectionAtPosition.form === 'identity') {
  expectType<readonly IdentityReference<Event>[]>(collectionAtPosition.entries)
} else {
  expectType<CollectionSelector>(collectionAtPosition.selector)
}
expectNotAssignable<ObjectReferenceVariant<Event>>(collectionAtPosition)
expectNotAssignable<CollectionReferenceVariant<Event>>(atPosition)

// The reference registry maps resource keys to identifier value types, and an
// app contract's resources table is one.
declare const textId: ValueType<string>
expectAssignable<ReferenceRegistry>({ note: { id: textId } })
expectNotAssignable<ReferenceRegistry>({ note: { record: textId } })
declare const contract: AppContract<unknown>
expectAssignable<ReferenceRegistry>(contract.resources)
