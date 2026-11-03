/**
 * Type tests for `bindReference` with a parent-scoped resource of a real
 * generated contract: Music's tracks are found only within a playlist, so
 * the Music resource table types `Track` with `parent: 'Playlist'`.
 *
 * phases/13 D7, "Resolvable targets" and "Caller-built references": data
 * for such a resource type-checks only with an identity reference to the
 * parent as its container; resources found at the application are
 * unaffected. A missing container is shown with `@ts-expect-error` on the
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
import type { IdentityReference, ResolvableReferenceData } from '@macts/contracts'
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
