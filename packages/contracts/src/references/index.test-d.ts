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
  ReferenceScope,
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

declare const byId: IdentityReference<Event, string>
declare const byName: SelectorReference<Event>
declare const explicitSet: IdentityCollectionReference<Event, string>
declare const allEvents: SelectorCollectionReference<Event>
declare const listed: ReferenceList<IdentityReference<Event, string>>

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
expectType<IdentityReference<Event, string> | undefined>(listed[0])
expectNotAssignable<Resolvable<unknown>>(listed)

// Form narrows to the concrete variant.
declare const single: IdentityReference<Event, string> | SelectorReference<Event>
if (single.form === 'identity') {
  expectType<string>(single.id)
} else {
  expectType<'name' | 'index'>(single.selector.by)
}

// Edge: identifier types are carried through.
declare const numericId: IdentityReference<Event, number>
expectType<number>(numericId.id)

// Edge: without an identifier type, every reference shape defaults it to unknown.
declare const defaultBoundId: IdentityReference<Event>['id']
expectType<unknown>(defaultBoundId)
declare const defaultEntries: IdentityCollectionReference<Event>['entries']
expectType<readonly IdentityReference<Event>[]>(defaultEntries)
declare const defaultVariant: ObjectReferenceVariant<Event>
if (defaultVariant.form === 'identity') expectType<unknown>(defaultVariant.id)
declare const defaultCollection: CollectionReferenceVariant<Event>
if (defaultCollection.form === 'identity') expectType<unknown>(defaultCollection.entries[0]?.id)

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
  app: 'calendar',
  resource: 'events',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'index', index: position },
  container: {
    app: 'calendar',
    resource: 'calendars',
    form: 'identity',
    cardinality: 'one',
    id: 7,
  },
})
expectNotAssignable<SelectorReferenceData>({
  app: 'calendar',
  resource: 'events',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'index', index: { integer: '0' } },
})
// Negative: an identity collection's data has no container; its entries carry their own.
expectNotAssignable<IdentityCollectionReferenceData>({
  app: 'calendar',
  resource: 'events',
  form: 'identity',
  cardinality: 'many',
  entries: [],
  container: {
    app: 'calendar',
    resource: 'calendars',
    form: 'identity',
    cardinality: 'one',
    id: 'C1',
  },
})

// Every data form, and so every bound form, names the app it belongs to.
expectType<string>(identityData.app)
expectType<string>(selectorCollectionData.app)
expectType<string>(byId.app)
expectType<string>(allEvents.app)
declare const objectReference: ObjectReference<Event>
declare const collectionReference: CollectionReference<Event>
expectType<string>(objectReference.app)
expectType<string>(collectionReference.app)
expectAssignable<IdentityReferenceData>({
  app: 'calendar',
  resource: 'events',
  form: 'identity',
  cardinality: 'one',
  id: 'E1',
})
// Negative: a hand-built literal without its app is not reference data, at
// any level.
expectNotAssignable<IdentityReferenceData>({
  resource: 'events',
  form: 'identity',
  cardinality: 'one',
  id: 'E1',
})
expectNotAssignable<SelectorReferenceData>({
  resource: 'events',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'Lunch' },
})
expectNotAssignable<IdentityCollectionReferenceData>({
  resource: 'events',
  form: 'identity',
  cardinality: 'many',
  entries: [],
})
expectNotAssignable<SelectorCollectionReferenceData>({
  resource: 'events',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
})
expectNotAssignable<IdentityReferenceData>({
  app: 'calendar',
  resource: 'events',
  form: 'identity',
  cardinality: 'one',
  id: 'E1',
  container: { resource: 'calendars', form: 'identity', cardinality: 'one', id: 'C1' },
})
expectNotAssignable<IdentityCollectionReferenceData>({
  app: 'calendar',
  resource: 'events',
  form: 'identity',
  cardinality: 'many',
  entries: [{ resource: 'events', form: 'identity', cardinality: 'one', id: 'E1' }],
})
expectNotAssignable<IdentityReferenceData>({
  app: 7,
  resource: 'events',
  form: 'identity',
  cardinality: 'one',
  id: 'E1',
})
// Negative: the wire form never carries the app.
expectNotAssignable<ReferenceWire>({
  app: 'calendar',
  resource: 'events',
  form: 'identity',
  cardinality: 'one',
  id: 'E1',
})

// Bound containers are bound references, of either form, and are valid data.
expectType<ObjectReferenceVariant<unknown> | undefined>(byId.container)
expectType<ObjectReferenceVariant<unknown> | undefined>(allEvents.container)
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

// Typed positions: the resource key is a literal type, so a reference to one
// resource is not assignable where another resource's reference is expected,
// in either direction, in data and bound forms alike.
interface Mailbox {
  readonly name: string
}
interface Account {
  readonly email: string
}
declare const mailbox: ObjectReferenceVariant<Mailbox, string, 'Mailbox'>
declare const account: ObjectReferenceVariant<Account, string, 'Account'>
expectAssignable<ObjectReferenceData<string, 'Mailbox'>>(mailbox)
expectAssignable<ObjectReferenceData<string, 'Account'>>(account)
expectNotAssignable<ObjectReferenceData<string, 'Account'>>(mailbox)
expectNotAssignable<ObjectReferenceData<string, 'Mailbox'>>(account)
expectNotAssignable<ObjectReferenceVariant<Account, string, 'Account'>>(mailbox)
expectNotAssignable<ObjectReferenceVariant<Mailbox, string, 'Mailbox'>>(account)
expectType<'Mailbox'>(mailbox.resource)

// An input position takes the data form: a caller can build either form, and
// a bound reference to the same resource is assignable to it.
expectAssignable<ObjectReferenceData<string, 'Account'>>({
  app: 'mail',
  resource: 'Account',
  form: 'identity',
  cardinality: 'one',
  id: 'A1',
})
expectAssignable<ObjectReferenceData<string, 'Account'>>({
  app: 'mail',
  resource: 'Account',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'Work' },
})
// Negative: a literal naming another resource, or with an identifier of the
// wrong type, is not that position's data.
expectNotAssignable<ObjectReferenceData<string, 'Account'>>({
  app: 'mail',
  resource: 'Mailbox',
  form: 'identity',
  cardinality: 'one',
  id: 'M1',
})
expectNotAssignable<ObjectReferenceData<string, 'Account'>>({
  app: 'mail',
  resource: 'Account',
  form: 'identity',
  cardinality: 'one',
  id: 7,
})

// The position fixes the cardinality: a single-object position accepts only
// single-object data, in every form, and a collection position only
// collections.
declare const mailboxes: CollectionReferenceVariant<Mailbox, string, 'Mailbox'>
expectAssignable<CollectionReferenceData<string, 'Mailbox'>>(mailboxes)
expectNotAssignable<ObjectReferenceData<string, 'Mailbox'>>(mailboxes)
expectNotAssignable<CollectionReferenceData<string, 'Mailbox'>>(mailbox)
expectNotAssignable<ObjectReferenceData<string, 'Mailbox'>>({
  app: 'mail',
  resource: 'Mailbox',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
})
expectNotAssignable<ObjectReferenceData<string, 'Mailbox'>>({
  app: 'mail',
  resource: 'Mailbox',
  form: 'identity',
  cardinality: 'many',
  entries: [],
})
// Identity-collection entries name the collection's resource.
expectNotAssignable<CollectionReferenceData<string, 'Mailbox'>>({
  app: 'mail',
  resource: 'Mailbox',
  form: 'identity',
  cardinality: 'many',
  entries: [{ app: 'mail', resource: 'Account', form: 'identity', cardinality: 'one', id: 'A1' }],
})

// Without a resource type argument, every reference type admits any resource.
expectType<string>(byId.resource)
expectAssignable<ObjectReferenceData>(mailbox)

// The reference registry maps resource keys to identifier value types, where
// a resource has one, and an app contract's resources table is one.
declare const textId: ValueType<string>
expectAssignable<ReferenceRegistry>({ note: { id: textId } })
expectAssignable<ReferenceRegistry>({ note: { id: textId }, paragraph: {} })
expectType<ValueType<unknown> | undefined>(null as unknown as ReferenceRegistry[string]['id'])
expectNotAssignable<ReferenceRegistry>({ note: { id: 'note-id' } })
declare const contract: AppContract<unknown>
expectAssignable<ReferenceRegistry>(contract.resources)
// Entries name the operations that resolve references to the resource.
expectAssignable<ReferenceRegistry>({
  note: { id: textId, get: 'notes.notes.get', list: 'notes.notes.list' },
})
expectNotAssignable<ReferenceRegistry>({ note: { id: textId, get: 'get' } })

// A reference scope is an app and its resource table; an app contract is one.
expectAssignable<ReferenceScope>(contract)
expectAssignable<ReferenceScope>({ app: 'notes', resources: { note: { id: textId } } })
expectType<string>(null as unknown as ReferenceScope['app'])
expectType<ReferenceRegistry>(null as unknown as ReferenceScope['resources'])
// Negative: a resource table alone, or a scope without its app, is not a scope.
expectNotAssignable<ReferenceScope>(contract.resources)
expectNotAssignable<ReferenceScope>({ resources: { note: { id: textId } } })
