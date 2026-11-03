/**
 * Type tests for reference data to parent-scoped resources: a table entry
 * that names a literal `parent` makes the parent's identity container
 * required in every resolvable reference to that resource, at every level.
 *
 * Expected types are written by hand from phases/13 D7 ("Resolvable
 * targets"): the container is an identity reference to the parent, whose own
 * container follows the parent's rule, or a reference a client bound.
 * Resources found at the application keep an optional container of any
 * resolvable resource.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  IdentityReference,
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

/** Tracks are found within a playlist; books within a shelf within a library. */
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
    readonly parent: 'Playlist'
  }
  Library: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.libraries.get'
  }
  Shelf: ResourceDescriptor<unknown, string> & {
    readonly id: ValueType<string>
    readonly get: 'music.shelves.get'
    readonly parent: 'Library'
  }
}>

type Data = ResolvableReferenceData<MusicResources>

expectType<'Playlist'>(null as unknown as ResourceParentOf<MusicResources, 'Track'>)
expectType<never>(null as unknown as ResourceParentOf<MusicResources, 'Playlist'>)
// A table whose keys are not known names no parent.
expectType<never>(null as unknown as ResourceParentOf<ResourceTable, 'Track'>)

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
