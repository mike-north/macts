/**
 * Type tests for reference data resolved through an operation that records a
 * parent: a table entry whose `parents` names a literal parent for `get` or
 * `list` makes that parent's identity container required in every reference
 * resolved through the operation, at every level.
 *
 * Expected types are written by hand from phases/13 D7 ("Parent-scoped
 * targets"): a single-object reference (identity, name or index selector), a
 * container and an identity-collection entry take the `get` parent; a
 * selector collection (every or range) takes the `list` parent. The container
 * is an identity reference to the parent, whose own container follows the
 * parent's rule, or a reference a client bound. Resources whose operations
 * work at the application keep an optional container of any resolvable
 * resource.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  IdentityReference,
  Integer,
  ResolvableReferenceData,
  ResourceDescriptor,
  ResourceParentOf,
  ResourceTable,
  ValueType,
} from '../index.js'

interface Playlist {
  readonly name: string
}
interface Track {
  readonly title: string
}

/**
 * Tracks are got and listed within a playlist; shelves are got within a
 * library. Reminders are got at the application but listed within a list.
 * Messages are got within a mailbox but listed within an account.
 */
type MusicResources = Readonly<{
  Playlist: ResourceDescriptor<Playlist, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.playlists.get'
    readonly list: 'music.playlists.list'
  }
  Track: ResourceDescriptor<Track, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.tracks.get'
    readonly list: 'music.tracks.list'
    readonly parents: { readonly get: 'Playlist'; readonly list: 'Playlist' }
  }
  Library: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.libraries.get'
  }
  Shelf: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.shelves.get'
    readonly parents: { readonly get: 'Library' }
  }
  List: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.lists.get'
  }
  Reminder: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.reminders.get'
    readonly list: 'music.reminders.list'
    readonly parents: { readonly list: 'List' }
  }
  Account: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.accounts.get'
  }
  Mailbox: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.mailboxes.get'
  }
  Message: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.messages.get'
    readonly list: 'music.messages.list'
    readonly parents: { readonly get: 'Mailbox'; readonly list: 'Account' }
  }
}>

type Data = ResolvableReferenceData<MusicResources>

expectType<'Playlist'>(null as unknown as ResourceParentOf<MusicResources, 'Track', 'get'>)
expectType<'Playlist'>(null as unknown as ResourceParentOf<MusicResources, 'Track', 'list'>)
expectType<never>(null as unknown as ResourceParentOf<MusicResources, 'Playlist', 'get'>)
expectType<never>(null as unknown as ResourceParentOf<MusicResources, 'Reminder', 'get'>)
expectType<'List'>(null as unknown as ResourceParentOf<MusicResources, 'Reminder', 'list'>)
expectType<'Mailbox'>(null as unknown as ResourceParentOf<MusicResources, 'Message', 'get'>)
expectType<'Account'>(null as unknown as ResourceParentOf<MusicResources, 'Message', 'list'>)
// A table whose keys are not known names no parent.
expectType<never>(null as unknown as ResourceParentOf<ResourceTable, 'Track', 'get'>)

const playlistData = {
  app: 'music',
  resource: 'Playlist',
  form: 'identity',
  cardinality: 'one',
  id: 'P1',
} as const

// Negative: no container.
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Track',
  form: 'identity',
  cardinality: 'one',
  id: 'T1',
} as const)
// Negative: a selector reference without one, too.
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Track',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'Intro' },
} as const)
// Negative: a container of another resource.
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Track',
  form: 'identity',
  cardinality: 'one',
  id: 'T1',
  container: { app: 'music', resource: 'Library', form: 'identity', cardinality: 'one', id: 'L1' },
} as const)
// Negative: a selector container supplies no identifier.
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Track',
  form: 'identity',
  cardinality: 'one',
  id: 'T1',
  container: {
    app: 'music',
    resource: 'Playlist',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'name', name: 'Road trip' },
  },
} as const)
// Negative: a selector collection without the container.
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Track',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const)

// With the parent's identity container, it type-checks.
expectAssignable<Data>({
  app: 'music',
  resource: 'Track',
  form: 'identity',
  cardinality: 'one',
  id: 'T1',
  container: playlistData,
} as const)
expectAssignable<Data>({
  app: 'music',
  resource: 'Track',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
  container: playlistData,
} as const)
// A bound playlist reference is admitted as the container.
declare const boundPlaylist: IdentityReference<Playlist, string, 'Playlist'>
expectAssignable<Data>({
  app: 'music',
  resource: 'Track',
  form: 'identity',
  cardinality: 'one',
  id: 'T1',
  container: boundPlaylist,
} as const)

// The container follows its own resource's rule at every level: a track
// standing as the library's container still needs its playlist.
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Shelf',
  form: 'identity',
  cardinality: 'one',
  id: 'S1',
  container: {
    app: 'music',
    resource: 'Library',
    form: 'identity',
    cardinality: 'one',
    id: 'L1',
    container: {
      app: 'music',
      resource: 'Track',
      form: 'identity',
      cardinality: 'one',
      id: 'T1',
    },
  },
} as const)

expectAssignable<Data>({
  app: 'music',
  resource: 'Shelf',
  form: 'identity',
  cardinality: 'one',
  id: 'S1',
  container: { app: 'music', resource: 'Library', form: 'identity', cardinality: 'one', id: 'L1' },
} as const)

// A resource found at the application is unaffected: no container needed.
expectAssignable<Data>(playlistData)

/** A selector position, as SDK data carries it. */
declare const position: Integer

// Each form takes the parent of the operation that resolves it. Messages are
// got within a mailbox and listed within an account.
const mailbox = {
  app: 'music',
  resource: 'Mailbox',
  form: 'identity',
  cardinality: 'one',
  id: 'X1',
} as const
const account = {
  app: 'music',
  resource: 'Account',
  form: 'identity',
  cardinality: 'one',
  id: 'A1',
} as const
const messageIn = <Container>(container: Container) =>
  ({
    app: 'music',
    resource: 'Message',
    form: 'identity',
    cardinality: 'one',
    id: 'M1',
    container,
  }) as const

// A single identity reference resolves through get: the mailbox.
expectAssignable<Data>(messageIn(mailbox))
expectNotAssignable<Data>(messageIn(account))
// A single selector reference, by name or by index, resolves through get too.
expectAssignable<Data>({
  app: 'music',
  resource: 'Message',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'index', index: position },
  container: mailbox,
} as const)
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Message',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'Hello' },
  container: account,
} as const)
// A selector collection, every or range, resolves through list: the account.
expectAssignable<Data>({
  app: 'music',
  resource: 'Message',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'range', start: position, end: position },
  container: account,
} as const)
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Message',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
  container: mailbox,
} as const)
// An identity-collection entry resolves through get: each takes the mailbox.
expectAssignable<Data>({
  app: 'music',
  resource: 'Message',
  form: 'identity',
  cardinality: 'many',
  entries: [messageIn(mailbox)],
} as const)
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Message',
  form: 'identity',
  cardinality: 'many',
  entries: [messageIn(account)],
} as const)
// A container resolves through its own resource's get: a message standing as
// a playlist's container takes the mailbox.
expectAssignable<Data>({ ...playlistData, container: messageIn(mailbox) } as const)
expectNotAssignable<Data>({ ...playlistData, container: messageIn(account) } as const)

// Reminders are listed within a list: a collection without it does not
// type-check, one within a list does, and a single reminder needs none.
expectNotAssignable<Data>({
  app: 'music',
  resource: 'Reminder',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const)
expectAssignable<Data>({
  app: 'music',
  resource: 'Reminder',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
  container: { app: 'music', resource: 'List', form: 'identity', cardinality: 'one', id: 'L1' },
} as const)
expectAssignable<Data>({
  app: 'music',
  resource: 'Reminder',
  form: 'identity',
  cardinality: 'one',
  id: 'R1',
} as const)
