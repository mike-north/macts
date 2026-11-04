/**
 * Type tests for `bindReference` with references resolved through an
 * operation that records a parent, over real generated contracts: Music gets
 * and lists tracks only within a playlist (`Track` is typed with
 * `parents: { get: 'Playlist'; list: 'Playlist' }`), and TV gets and lists
 * playlists only within a source (`Playlist` is typed with
 * `parents: { get: 'Source'; list: 'Source' }`); Reminders lists reminders
 * only within a list and Microsoft Edge tabs only within a window
 * (`parents: { list: … }`), while getting one at the application.
 *
 * phases/13 D7, "Parent-scoped targets" and "Caller-built references": data
 * resolved through such an operation type-checks only with an identity
 * reference to that parent as its container; references resolved through an
 * operation at the application are unaffected. A missing container is shown with `@ts-expect-error` on the
 * call itself, which both `tsc --noEmit` and tsd enforce.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D7
 */

import { expectNotAssignable, expectType } from 'tsd'
import {
  musicContract,
  type MusicResources,
  type Playlist,
  type Track,
} from '@macts/music/contract'
import { microsoftEdgeContract } from '@macts/microsoft-edge/contract'
import { remindersContract, type Reminder } from '@macts/reminders/contract'
import {
  tvContract,
  type Playlist as TVPlaylist,
  type Source as TVSource,
  type TVResources,
} from '@macts/tv/contract'
import type {
  IdentityReference,
  ResolvableReferenceData,
  SelectorCollectionReference,
} from '@macts/contracts'
import * as remote from './index.js'
import { bindReference } from './index.js'

const music = remote.createClient(musicContract, {
  token: 'macts_sk_example',
  url: 'http://localhost:8372',
})

const playlist = {
  app: 'music',
  resource: 'Playlist',
  form: 'identity',
  cardinality: 'one',
  id: '4A1B2C3D4E5F6071',
} as const

const looseTrack = {
  app: 'music',
  resource: 'Track',
  form: 'identity',
  cardinality: 'one',
  id: '0F1E2D3C4B5A6978',
} as const

// @ts-expect-error -- a track needs its playlist as its container
bindReference(music, looseTrack)
expectNotAssignable<ResolvableReferenceData<MusicResources>>(looseTrack)
expectNotAssignable<ResolvableReferenceData<MusicResources>>({
  ...looseTrack,
  container: { ...looseTrack, container: playlist },
} as const)

// With the playlist, it binds to a track reference.
expectType<IdentityReference<Track, string, 'Track'>>(
  bindReference(music, { ...looseTrack, container: playlist })
)
// A bound playlist is a container too.
const boundPlaylist = bindReference(music, playlist)
expectType<IdentityReference<Playlist, string, 'Playlist'>>(boundPlaylist)
expectType<IdentityReference<Track, string, 'Track'>>(
  bindReference(music, { ...looseTrack, container: boundPlaylist })
)

const reminders = remote.createClient(remindersContract, {
  token: 'macts_sk_example',
  url: 'http://localhost:8372',
})
const edge = remote.createClient(microsoftEdgeContract, {
  token: 'macts_sk_example',
  url: 'http://localhost:8372',
})

const everyReminder = {
  app: 'reminders',
  resource: 'Reminder',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const

// @ts-expect-error -- every reminder is listed within a list, so it needs one as its container
bindReference(reminders, everyReminder)
// With the list, it binds to a collection of reminders.
expectType<SelectorCollectionReference<Reminder, 'Reminder'>>(
  bindReference(reminders, {
    ...everyReminder,
    container: {
      app: 'reminders',
      resource: 'List',
      form: 'identity',
      cardinality: 'one',
      id: 'x-apple-reminder-list://ABC',
    },
  })
)
// One reminder is got at the application, so it needs no container.
expectType<IdentityReference<Reminder, string, 'Reminder'>>(
  bindReference(reminders, {
    app: 'reminders',
    resource: 'Reminder',
    form: 'identity',
    cardinality: 'one',
    id: 'x-apple-reminder://R1',
  })
)

// @ts-expect-error -- every tab is listed within a window, so it needs one as its container
bindReference(edge, { ...everyReminder, app: 'microsoft-edge', resource: 'Tab' })
bindReference(edge, {
  ...everyReminder,
  app: 'microsoft-edge',
  resource: 'Tab',
  container: {
    app: 'microsoft-edge',
    resource: 'Window',
    form: 'identity',
    cardinality: 'one',
    id: 'W1',
  },
})

const tv = remote.createClient(tvContract, {
  token: 'macts_sk_example',
  url: 'http://localhost:8372',
})

const tvSource = {
  app: 'tv',
  resource: 'Source',
  form: 'identity',
  cardinality: 'one',
  id: '1A2B3C4D5E6F7081',
} as const

const looseTVPlaylist = {
  app: 'tv',
  resource: 'Playlist',
  form: 'identity',
  cardinality: 'one',
  id: '8091A2B3C4D5E6F7',
} as const

// @ts-expect-error -- a TV playlist is read within its source, so it needs one as its container
bindReference(tv, looseTVPlaylist)
expectNotAssignable<ResolvableReferenceData<TVResources>>(looseTVPlaylist)
// A source picked by position supplies no identifier, so it cannot stand as the container.
expectNotAssignable<ResolvableReferenceData<TVResources>>({
  ...looseTVPlaylist,
  container: {
    app: 'tv',
    resource: 'Source',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index: 0 },
  },
} as const)

// With its source, it binds to a playlist reference.
expectType<IdentityReference<TVPlaylist, string, 'Playlist'>>(
  bindReference(tv, { ...looseTVPlaylist, container: tvSource })
)
// A source is got at the application, so it needs no container, and a bound
// source is a container too.
const boundSource = bindReference(tv, tvSource)
expectType<IdentityReference<TVSource, string, 'Source'>>(boundSource)
expectType<IdentityReference<TVPlaylist, string, 'Playlist'>>(
  bindReference(tv, { ...looseTVPlaylist, container: boundSource })
)

const everyTVPlaylist = {
  app: 'tv',
  resource: 'Playlist',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const
// @ts-expect-error -- every playlist is listed within a source, so it needs one as its container
bindReference(tv, everyTVPlaylist)
expectType<SelectorCollectionReference<TVPlaylist, 'Playlist'>>(
  bindReference(tv, { ...everyTVPlaylist, container: tvSource })
)
