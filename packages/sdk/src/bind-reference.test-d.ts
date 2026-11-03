/**
 * Type tests for binding caller-built references to a client of a contract
 * whose resource table type is known.
 *
 * phases/13 D7, "Caller-built references": the type of `bindReference`
 * admits only the contract's resolvable resource keys and returns the bound
 * variant for that key, form, and cardinality. A reference resolves through
 * the operation its resource records for its cardinality
 * (`resolvingOperationKey`): `get` for a single object, a container, and an
 * identity-collection entry; `list` for a collection. An identity reference
 * carries the resource's identifier, so a resource without one admits only
 * selectors.
 *
 * The cases run against real generated contracts and against two fixtures:
 * the hand-built library contract (`Branch` records `get` but no `list`) and
 * a declared catalog table with the shapes no real contract here has.
 *
 * Invalid calls are marked `@ts-expect-error`, which both `tsc --noEmit` and
 * tsd enforce: an invalid call that type-checks fails the build. Each invalid
 * reference is declared first, so the call, and the error reported at its
 * argument, fits on the one line the directive covers.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D7)
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import { calendarContract, type Calendar, type Event } from '@macts/calendar/contract'
import { contactsContract } from '@macts/contacts/contract'
import { musicContract, type BrowserWindow, type Playlist } from '@macts/music/contract'
import { notesContract, type Note, type NotesResources } from '@macts/notes/contract'
import type {
  AppContract,
  ClientBrand,
  CollectionReferenceVariant,
  IdentityCollectionReference,
  IdentityReference,
  Integer,
  ObjectReferenceData,
  ObjectReferenceVariant,
  ReferenceData,
  ResolvableReferenceData,
  ResolvableResourceKey,
  SelectorCollectionReference,
  SelectorReference,
  ValueType,
} from '@macts/contracts'
import * as remote from './index.js'
import { bindReference } from './index.js'
import * as local from './local.js'
import {
  libraryContract,
  type Book,
  type LibraryClient,
  type LibraryResources,
  type Shelf,
} from './library-fixture.js'

const options = { token: 'macts_sk_example', url: 'http://localhost:8372' }
const notes = remote.createClient(notesContract, options)
const calendar = local.createClient(calendarContract, { token: options.token })
const contacts = remote.createClient(contactsContract, options)
const music = remote.createClient(musicContract, options)
const library = remote.createClient(libraryContract, options)

// --- Factories carry the contract's resource table ------------------------

expectType<typeof notesContract.resources>(null as unknown as NotesResources)
expectAssignable<ClientBrand<NotesResources>>(notes)
expectAssignable<ClientBrand<LibraryResources>>(library)
// Only the keys the table records the resolving operation for.
expectType<'Account' | 'Folder' | 'Note' | 'Attachment'>(
  null as unknown as ResolvableResourceKey<NotesResources, 'one'>
)
expectType<'Branch' | 'Shelf' | 'Book'>(
  null as unknown as ResolvableResourceKey<LibraryResources, 'one'>
)
expectType<'Shelf' | 'Book'>(null as unknown as ResolvableResourceKey<LibraryResources, 'many'>)

// --- A resolvable key gives its bound variant, resolving to its record ----

const note = bindReference(notes, {
  app: 'notes',
  resource: 'Note',
  form: 'identity',
  cardinality: 'one',
  id: 'Groceries',
})
expectType<IdentityReference<Note, string, 'Note'>>(note)
expectType<Promise<Note>>(note.resolve())

const firstCalendar = remote.bindReference(calendar, {
  app: 'calendar',
  resource: 'Calendar',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'Work' },
})
expectType<SelectorReference<Calendar, 'Calendar'>>(firstCalendar)
expectType<Promise<Calendar>>(firstCalendar.resolve())

const events = local.bindReference(calendar, {
  app: 'calendar',
  resource: 'Event',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
  container: {
    app: 'calendar',
    resource: 'Calendar',
    form: 'identity',
    cardinality: 'one',
    id: 'Work',
  },
})
expectType<SelectorCollectionReference<Event, 'Event'>>(events)
expectType<Promise<readonly Event[]>>(events.resolve())

const sequels = bindReference(library, {
  app: 'library',
  resource: 'Book',
  form: 'identity',
  cardinality: 'many',
  entries: [{ app: 'library', resource: 'Book', form: 'identity', cardinality: 'one', id: 'x' }],
})
expectType<IdentityCollectionReference<Book, string, 'Book'>>(sequels)
expectType<Promise<readonly Book[]>>(sequels.resolve())

// Data of either form gives the union of both bound variants.
declare const byCode: boolean
const shelfByCode = {
  app: 'library',
  resource: 'Shelf',
  form: 'identity',
  cardinality: 'one',
  id: 'SF-1',
} as const
const shelfByName = {
  app: 'library',
  resource: 'Shelf',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'SF' },
} as const
expectType<ObjectReferenceVariant<Shelf, string, 'Shelf'>>(
  bindReference(library, byCode ? shelfByCode : shelfByName)
)

// Data typed only by the general data form leaves its container's resource
// unchecked, so it is not admitted; data built in place or bound is.
declare const shelfData: ObjectReferenceData<string, 'Shelf'>
expectNotAssignable<ResolvableReferenceData<LibraryResources>>(shelfData)

// A reference a client decoded rebinds to its own variant, whatever its container.
declare const browserWindow: BrowserWindow
if (browserWindow.view !== null) {
  const view = bindReference(music, browserWindow.view)
  expectType<ObjectReferenceVariant<Playlist, string, 'Playlist'>>(view)
  expectType<Promise<Playlist>>(view.resolve())
}
declare const book: Book
expectType<ObjectReferenceVariant<Shelf, string, 'Shelf'>>(bindReference(library, book.shelf))
expectType<CollectionReferenceVariant<Book, string, 'Book'>>(bindReference(library, book.sequels))

// A container a client bound is admitted as it is; its resource was checked when decoded.
expectType<Promise<Book>>(
  bindReference(library, {
    app: 'library',
    resource: 'Book',
    form: 'identity',
    cardinality: 'one',
    id: 'x',
    container: book.shelf,
  }).resolve()
)

// --- Unresolvable keys are rejected ---------------------------------------

// A key the table does not have.
const unknownKey = {
  app: 'notes',
  resource: 'Notebook',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'x' },
} as const
// @ts-expect-error -- `Notebook` is not a resource of the notes contract
bindReference(notes, unknownKey)

// A key with neither `get` nor `list`, bound as either cardinality.
const attendee = {
  app: 'calendar',
  resource: 'Attendee',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'Ann' },
} as const
const attendees = {
  app: 'calendar',
  resource: 'Attendee',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const
// @ts-expect-error -- `Attendee` records no `get`
bindReference(calendar, attendee)
// @ts-expect-error -- `Attendee` records no `list`
bindReference(calendar, attendees)
expectNotAssignable<ResolvableReferenceData<typeof calendarContract.resources>>(attendee)

// A key with `get` but no `list`, bound as `'many'`.
const branches = {
  app: 'library',
  resource: 'Branch',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const
// @ts-expect-error -- `Branch` records no `list`
bindReference(library, branches)
expectAssignable<ResolvableReferenceData<LibraryResources>>({
  ...branches,
  cardinality: 'one',
  selector: { by: 'name', name: 'Downtown' },
} as const)

// A container whose resource has no `get`, at the first level and nested.
const inProfile = {
  app: 'contacts',
  resource: 'Person',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'Ann' },
  container: {
    app: 'contacts',
    resource: 'SocialProfile',
    form: 'identity',
    cardinality: 'one',
    id: 'p1',
  },
} as const
// @ts-expect-error -- `SocialProfile` records no `get`, so it cannot be a container
bindReference(contacts, inProfile)
const nestedInAttendee = {
  ...events,
  container: { ...events.container, container: attendee },
} as const
// @ts-expect-error -- `Attendee` records no `get`, so it cannot be a container at any level
bindReference(calendar, nestedInAttendee)

// An identity reference to a resource without an identifier.
const airPlayById = {
  app: 'music',
  resource: 'AirPlayDevice',
  form: 'identity',
  cardinality: 'one',
  id: 'x',
} as const
// @ts-expect-error -- `AirPlayDevice` records no `get` (and no identifier)
bindReference(music, airPlayById)

// An identifier of the wrong type.
const noteByNumber = {
  app: 'notes',
  resource: 'Note',
  form: 'identity',
  cardinality: 'one',
  id: 7,
} as const
// @ts-expect-error -- a note's identifier is a string
bindReference(notes, noteByNumber)

// --- A declared table with the shapes no real contract here has -----------

/** Catalog records: an item has an integer identifier; a tag has none. */
interface Item {
  readonly sku: Integer
}
interface Tag {
  readonly label: string
}
/**
 * `Item` records both operations, `Tag` only `list` (and no identifier), and
 * `Aisle` neither.
 */
interface CatalogTable {
  readonly Item: {
    readonly name: 'Item'
    readonly record: ValueType<Item>
    readonly id: ValueType<Integer>
    readonly get: 'catalog.items.get'
    readonly list: 'catalog.items.list'
  }
  readonly Tag: {
    readonly name: 'Tag'
    readonly record: ValueType<Tag>
    readonly list: 'catalog.tags.list'
  }
  readonly Aisle: { readonly name: 'Aisle'; readonly record: ValueType<unknown> }
}
// A table type is an anonymous object type, as `typeof` a generated table is.
type CatalogResources = Pick<CatalogTable, keyof CatalogTable>
declare const catalog: Record<string, never> & ClientBrand<CatalogResources>
declare const sku: Integer

const tags = bindReference(catalog, {
  app: 'catalog',
  resource: 'Tag',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
})
expectType<SelectorCollectionReference<Tag, 'Tag'>>(tags)
expectType<Promise<readonly Tag[]>>(tags.resolve())
expectType<Promise<Item>>(
  bindReference(catalog, {
    app: 'catalog',
    resource: 'Item',
    form: 'identity',
    cardinality: 'one',
    id: sku,
  }).resolve()
)

// A key with `list` but no `get`: not a single reference, not an identity
// collection (its entries resolve through `get`), and not a container.
const oneTag = {
  app: 'catalog',
  resource: 'Tag',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'index', index: sku },
} as const
const tagEntries = {
  app: 'catalog',
  resource: 'Tag',
  form: 'identity',
  cardinality: 'many',
  entries: [],
} as const
const itemsInTag = {
  app: 'catalog',
  resource: 'Item',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
  container: oneTag,
} as const
// @ts-expect-error -- `Tag` records no `get`
bindReference(catalog, oneTag)
// @ts-expect-error -- the entries of a `Tag` collection would resolve through `get`
bindReference(catalog, tagEntries)
// @ts-expect-error -- `Tag` records no `get`, so it cannot be a container
bindReference(catalog, itemsInTag)
// A resource with neither operation.
const aisles = {
  app: 'catalog',
  resource: 'Aisle',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const
// @ts-expect-error -- `Aisle` records no `list`
bindReference(catalog, aisles)

// --- A contract that declares no table type --------------------------------

// `AppContract<Client>` with no second argument still type-checks, and its
// clients bind any reference data, with records of type `unknown`.
declare const untyped: AppContract<LibraryClient>
const untypedClient = local.createClient(untyped, { token: 't' })
expectAssignable<LibraryClient>(untypedClient)
declare const anyReference: ReferenceData
expectType<ObjectReferenceVariant<unknown> | CollectionReferenceVariant<unknown>>(
  bindReference(untypedClient, anyReference)
)
expectType<Promise<unknown>>(
  bindReference(untypedClient, {
    app: 'library',
    resource: 'Aisle',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'name', name: 'x' },
  }).resolve()
)
// A typed contract is still an `AppContract<Client>`.
expectAssignable<AppContract<LibraryClient>>(libraryContract)

// --- Only clients from the factories -----------------------------------------

// @ts-expect-error -- a client of no contract carries no resource table
bindReference({ notes: 1 }, anyReference)
