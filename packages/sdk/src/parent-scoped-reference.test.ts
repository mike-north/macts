/**
 * Tests for binding and resolving caller-built references resolved through an
 * operation that records a parent, over real generated contracts: Music gets
 * and lists a track only within a playlist (`parents: { get: 'Playlist',
 * list: 'Playlist' }`), and TV a playlist only within a source (`parents:
 * { get: 'Source', list: 'Source' }`); Reminders lists reminders only within a list and
 * Microsoft Edge tabs only within a window, while getting one at the
 * application (`parents: { list: … }`).
 *
 * Expected values are written by hand from phases/13 D7 ("Parent-scoped
 * targets", "Caller-built references"): `bindReference` encodes the data, so
 * a reference without the container its resolving operation needs is a
 * `ValidationError` at `container` and nothing is sent; with it, the
 * reference binds and its `resolve()` sends the container to the transport
 * unchanged.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D7
 */

import { microsoftEdgeContract } from '@macts/microsoft-edge/contract'
import { musicContract } from '@macts/music/contract'
import { remindersContract } from '@macts/reminders/contract'
import { tvContract } from '@macts/tv/contract'
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
  return recordingClient(musicContract, answer)
}

/** A client of `contract` whose transport records each request; see {@link recordingMusicClient}. */
function recordingClient(
  contract: Parameters<typeof createCodecClient>[0],
  answer: unknown
): { client: ClientBrand<ResourceTable>; sent: Sent[] } {
  const sent: Sent[] = []
  const client = createCodecClient(contract, {
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

/** The issues of the `ValidationError` binding `data` to `client` raises. */
function bindingIssues(
  client: ClientBrand<ResourceTable>,
  data: unknown
): { path: readonly (string | number)[]; message: string }[] {
  // A caller that bypassed the static types.
  const error = thrownBy(() => bindReference(client, data as ReferenceData))
  expect(error).toBeInstanceOf(ValidationError)
  if (!(error instanceof ValidationError)) return []
  return error.details.issues.map(({ path, message }) => ({ path, message }))
}

describe('bindReference with a collection the app lists only within a parent', () => {
  const everyReminder = {
    app: 'reminders',
    resource: 'Reminder',
    form: 'selector',
    cardinality: 'many',
    selector: { by: 'every' },
  } as const
  const list = {
    app: 'reminders',
    resource: 'List',
    form: 'identity',
    cardinality: 'one',
    id: 'x-apple-reminder-list://ABC',
  } as const

  it('raises ValidationError naming the list when every reminder has no container', () => {
    const { client, sent } = recordingClient(remindersContract, [])
    expect(bindingIssues(client, everyReminder)).toEqual([
      {
        path: ['container'],
        message:
          'The required field "container" is missing; expected an identity reference to the ' +
          '"List" whose "Reminder" objects are selected, because the app lists "Reminder" ' +
          'objects only within their "List".',
      },
    ])
    expect(sent).toEqual([])
  })

  it('raises ValidationError naming the window when every tab has no container', () => {
    const { client } = recordingClient(microsoftEdgeContract, [])
    const everyTab = { ...everyReminder, app: 'microsoft-edge', resource: 'Tab' }
    expect(bindingIssues(client, everyTab)).toEqual([
      {
        path: ['container'],
        message:
          'The required field "container" is missing; expected an identity reference to the ' +
          '"Window" whose "Tab" objects are selected, because the app lists "Tab" objects only ' +
          'within their "Window".',
      },
    ])
  })

  it('binds every reminder within a list, and resolves it with the container', async () => {
    const { client, sent } = recordingClient(remindersContract, [])
    const reminders = bindReference(client, { ...everyReminder, container: list })
    await reminders.resolve().catch(() => undefined)
    expect(sent[0]).toEqual({
      kind: 'resolve',
      wire: {
        reference: {
          resource: 'Reminder',
          form: 'selector',
          cardinality: 'many',
          selector: { by: 'every' },
          container: { resource: 'List', form: 'identity', cardinality: 'one', id: list.id },
        },
      },
    })
  })

  it('binds one reminder with no container, because the get works at the application', () => {
    const { client } = recordingClient(remindersContract, {})
    const reminder = {
      app: 'reminders',
      resource: 'Reminder',
      form: 'identity',
      cardinality: 'one',
      id: 'x-apple-reminder://R1',
    } as const
    expect(bindReference(client, reminder)).toMatchObject(reminder)
  })
})

describe('bindReference with a TV playlist, read only within its source', () => {
  // Made-up persistent IDs, in the form the app uses.
  const source = {
    app: 'tv',
    resource: 'Source',
    form: 'identity',
    cardinality: 'one',
    id: '1A2B3C4D5E6F7081',
  } as const
  const playlist = {
    app: 'tv',
    resource: 'Playlist',
    form: 'identity',
    cardinality: 'one',
    id: '8091A2B3C4D5E6F7',
  } as const

  it('raises ValidationError naming the source when one playlist has no container, sending nothing', () => {
    const { client, sent } = recordingClient(tvContract, {})
    expect(bindingIssues(client, playlist)).toEqual([
      {
        path: ['container'],
        message:
          'The required field "container" is missing; expected an identity reference to the ' +
          '"Source" the "Playlist" is in, because the app finds each "Playlist" only within ' +
          'its "Source".',
      },
    ])
    expect(sent).toEqual([])
  })

  it('raises ValidationError when the container picks a source by position, not identifier', () => {
    const { client } = recordingClient(tvContract, {})
    const firstSource = {
      app: 'tv',
      resource: 'Source',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: 0 },
    }
    expect(bindingIssues(client, { ...playlist, container: firstSource })).toEqual([
      {
        path: ['container'],
        message:
          'The app finds each "Playlist" only within its "Source", by that "Source"\'s ' +
          'identifier, so the container must be an identity reference to the resource ' +
          '"Source"; received a selector reference to "Source".',
      },
    ])
  })

  it('binds a playlist within its source, and resolves it with the container', async () => {
    const { client, sent } = recordingClient(tvContract, {})
    const bound = bindReference(client, { ...playlist, container: source })
    expect(bound).toMatchObject({ ...playlist, container: source })
    await bound.resolve().catch(() => undefined)
    expect(sent[0]).toEqual({
      kind: 'resolve',
      wire: {
        reference: {
          resource: 'Playlist',
          form: 'identity',
          cardinality: 'one',
          id: playlist.id,
          container: { resource: 'Source', form: 'identity', cardinality: 'one', id: source.id },
        },
      },
    })
  })

  it('raises ValidationError naming the source when every playlist has no container', () => {
    const { client } = recordingClient(tvContract, [])
    const everyPlaylist = {
      app: 'tv',
      resource: 'Playlist',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
    } as const
    expect(bindingIssues(client, everyPlaylist)).toEqual([
      {
        path: ['container'],
        message:
          'The required field "container" is missing; expected an identity reference to the ' +
          '"Source" whose "Playlist" objects are selected, because the app lists "Playlist" ' +
          'objects only within their "Source".',
      },
    ])
    expect(bindReference(client, { ...everyPlaylist, container: source })).toMatchObject({
      ...everyPlaylist,
      container: source,
    })
  })

  it('leaves a source, found at the application, without a container', () => {
    const { client } = recordingClient(tvContract, {})
    expect(bindReference(client, source)).toMatchObject(source)
  })
})
