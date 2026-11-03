/**
 * Tests for binding and resolving caller-built references to a parent-scoped
 * resource, over the real Music contract: a track is found only within a
 * playlist, so its resource table entry names `parent: 'Playlist'`.
 *
 * Expected values are written by hand from phases/13 D7 ("Resolvable
 * targets", "Caller-built references"): `bindReference` encodes the data, so
 * a track reference without its playlist container is a `ValidationError`
 * at `container` and nothing is sent; with it, the reference binds and its
 * `resolve()` sends the container to the transport unchanged.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D7
 */

import { musicContract } from '@macts/music/contract'
import {
  ValidationError,
  type ClientBrand,
  type ReferenceData,
  type ResourceTable,
  type WireValue,
} from '@macts/contracts'
import { describe, expect, it } from 'vitest'
import { bindReference, createCodecClient } from './codec-runtime.js'
import { thrownBy } from './test-helpers.js'

/** What the client handed its transport. */
interface Sent {
  readonly kind: 'invoke' | 'resolve'
  readonly wire: WireValue
}

/**
 * A Music client whose transport records each request and answers with
 * `answer`. It is typed by the widest table, as a caller that bypassed the
 * static types sees it, so the runtime checks are what is tested.
 */
function recordingMusicClient(answer: unknown): {
  client: ClientBrand<ResourceTable>
  sent: Sent[]
} {
  const sent: Sent[] = []
  const client = createCodecClient(musicContract, {
    invoke: (_operation, wire) => {
      sent.push({ kind: 'invoke', wire })
      return Promise.resolve(answer)
    },
    resolve: (wire) => {
      sent.push({ kind: 'resolve', wire })
      return Promise.resolve(answer)
    },
  })
  return { client, sent }
}

const PLAYLIST = {
  app: 'music',
  resource: 'Playlist',
  form: 'identity',
  cardinality: 'one',
  id: '4A1B2C3D4E5F6071',
} as const

const TRACK = {
  app: 'music',
  resource: 'Track',
  form: 'identity',
  cardinality: 'one',
  id: '0F1E2D3C4B5A6978',
} as const

describe('bindReference with a parent-scoped resource', () => {
  it('raises ValidationError at the container when the playlist is missing, sending nothing', () => {
    const { client, sent } = recordingMusicClient({})
    // A caller that bypassed the static types.
    const error = thrownBy(() => bindReference(client, TRACK as ReferenceData))
    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map(({ path }) => path)).toEqual([['container']])
    expect(sent).toEqual([])
  })

  it('raises ValidationError for a container that is not a playlist', () => {
    const { client } = recordingMusicClient({})
    // Another track, itself within the playlist, is still not a playlist.
    const inTrack = { ...TRACK, container: { ...TRACK, container: PLAYLIST } }
    const error = thrownBy(() => bindReference(client, inTrack as ReferenceData))
    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map(({ path }) => path)).toEqual([['container']])
  })

  it('binds a track within its playlist, and resolves it with the container', async () => {
    const { client, sent } = recordingMusicClient({})
    const track = bindReference(client, { ...TRACK, container: PLAYLIST })
    expect(track).toMatchObject({ ...TRACK, container: PLAYLIST })
    await track.resolve().catch(() => undefined)
    expect(sent[0]).toEqual({
      kind: 'resolve',
      wire: {
        reference: {
          resource: 'Track',
          form: 'identity',
          cardinality: 'one',
          id: TRACK.id,
          container: {
            resource: 'Playlist',
            form: 'identity',
            cardinality: 'one',
            id: PLAYLIST.id,
          },
        },
      },
    })
  })

  it('leaves a playlist, found at the application, without a container', () => {
    const { client } = recordingMusicClient({})
    expect(bindReference(client, PLAYLIST)).toMatchObject(PLAYLIST)
  })
})
