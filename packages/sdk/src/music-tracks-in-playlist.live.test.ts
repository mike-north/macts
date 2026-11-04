/**
 * LOCALLY-AUTOMATABLE live check that Music tracks are found and resolved
 * within their playlist, against the real app. NOT run in CI.
 *
 * ## What this tests
 *
 * A track is got within its playlist, matched on its `persistentID`, so a
 * reference to one carries that playlist as its container, and resolving it
 * looks the track up within the container (phases/13 D7, container scoping).
 * Through `@macts/sdk/local`'s `createClient`, with the default native
 * executor, the suite lists every playlist and its tracks, takes the smallest
 * playlist holding a track that is not the library playlist (the library
 * playlist when no other holds one), and checks:
 *
 *   1. getting its first track by persistent ID within it reads back the same
 *      persistent ID, and resolving an identity reference to that track, with
 *      the playlist as container, does too;
 *   2. a track another playlist holds and this one does not is
 *      `TargetNotFoundError` naming `Track` within this playlist, from both
 *      `tracks.get` and resolution, rather than a record: the `whose` match
 *      the body and the codec use finds nothing under a playlist that does not
 *      hold the track. A playlist not holding the first track, and an empty
 *      playlist, are checked the same way when this Mac has one;
 *   3. a playlist id no playlist has is `TargetNotFoundError` naming
 *      `Playlist`, from both, and no track is looked up;
 *   4. a persistent ID repeated within one playlist, when this Mac has one,
 *      is got and resolved without error to the first listed entry: the track
 *      is not claimed unique within its playlist, so it resolves to the first
 *      match (D7, resolvable targets);
 *   5. persistent IDs are non-empty hexadecimal strings, and a track's
 *      persistent ID under any playlist is also listed under the library
 *      playlist, which holds every track.
 *
 * Every call is a read. Nothing is played, paused, rated, created, changed,
 * added or removed, and no command that acts on a track or playlist is
 * called. Assertions compare identifiers as booleans, and errors by class and
 * resource, so a failure never prints a name or identifier; only counts and
 * booleans are logged.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Music.app holding at least one
 *   playlist with a track. The library playlist alone is not enough for
 *   check 2, which needs a track the chosen playlist does not hold.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control Music. The first run raises a one-time prompt that only a person
 *   at the Mac can answer; until it is answered, calls hang and then fail with
 *   a timeout.
 * - The records come from the music library on this Mac.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * Listing the library playlist's tracks reads every track, so run this file
 * on its own, not beside other Music live files:
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/music-tracks-in-playlist.live.test.ts
 * ```
 *
 * @see /System/Applications/Music.app/Contents/Resources/Music.sdef
 * @see ../../../manifests/music/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7 container scoping, resolvable targets)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { musicContract, type MusicClient, type Playlist, type Track } from '@macts/music/contract'
import { MactsError } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { bindReference, createClient } from './local.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Per-test limit: a cold app launch plus the executor's own 30 s limit, several times. */
const LIVE_TEST_TIMEOUT_MS = 180_000

/** Limit for listing every playlist's tracks, the library playlist's included. */
const SCAN_TIMEOUT_MS = 600_000

/** The special kind Music reports for its library playlist, which holds every track. */
const LIBRARY_PLAYLIST_KIND = 'Library'

/** A playlist id no Music playlist has: a fixed 16-digit hexadecimal value. */
const MISSING_PLAYLIST_ID = '0000000000000000'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The suite mints its key there
// and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-tracks-in-playlist-live-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

setLogger(createLogger({ level: 'silent' }))

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

/** A playlist with the tracks listed under it, in the order the app lists them. */
interface ListedPlaylist {
  readonly playlist: Playlist
  readonly tracks: readonly Track[]
  /** Whether the playlist lists a track with `persistentID`. */
  holds(persistentID: string): boolean
}

/**
 * How a call settled, as names only: `resolved` when it returned, otherwise
 * the error's class and the resource its details name. Never a value.
 */
async function outcomeOf(call: () => Promise<unknown>): Promise<string> {
  try {
    await call()
    return 'resolved'
  } catch (error) {
    if (!(error instanceof MactsError)) return 'non-macts error'
    const details: unknown = error.details
    const resource =
      typeof details === 'object' && details !== null && 'resource' in details
        ? String(details.resource)
        : 'none'
    return `${error.name} naming ${resource}`
  }
}

/** A reference to the track with `persistentID`, within the playlist with `playlistId`. */
function within(persistentID: string, playlistId: string) {
  return {
    app: 'music',
    resource: 'Track',
    form: 'identity',
    cardinality: 'one',
    id: persistentID,
    container: {
      app: 'music',
      resource: 'Playlist',
      form: 'identity',
      cardinality: 'one',
      id: playlistId,
    },
  } as const
}

/** A record's `persistentID`, when it has one. */
function persistentIdOf(record: unknown): unknown {
  return typeof record === 'object' && record !== null && 'persistentID' in record
    ? record.persistentID
    : undefined
}

/** A record's numeric `id`, which names one entry of a track in one playlist. */
function entryIdOf(record: unknown): unknown {
  return typeof record === 'object' && record !== null && 'id' in record ? record.id : undefined
}

/** Whether `id` is a non-empty hexadecimal string. */
function isHexId(id: unknown): boolean {
  return typeof id === 'string' && /^[0-9A-Fa-f]+$/.test(id)
}

describe.skipIf(!liveAppsEnabled)(
  'Music tracks within a playlist, against Music.app (local only)',
  () => {
    let music: MusicClient
    let listed: readonly ListedPlaylist[] = []
    /** The smallest non-library playlist holding a track, else the library playlist. */
    let holder: ListedPlaylist | undefined

    beforeAll(async () => {
      const key = await createApiKey({
        name: 'Live Music tracks in playlist test',
        permissions: [
          'music:playlists:list',
          'music:playlists:get',
          'music:tracks:list',
          'music:tracks:get',
        ],
      })
      music = createClient(musicContract, {
        token: key.token,
        governance: { policy: ALLOW_ALL_POLICY },
      })
      // Playlists do not page: the one page holds every playlist, and the one
      // page of a playlist's tracks holds every track.
      const playlists = (await music.playlists.list()).items
      const read: ListedPlaylist[] = []
      for (const playlist of playlists) {
        const tracks = (await music.tracks.list(playlist.persistentID)).items
        const ids = new Set(tracks.map((track) => track.persistentID))
        read.push({ playlist, tracks, holds: (id) => ids.has(id) })
      }
      listed = read
      const withTracks = read.filter(({ tracks }) => tracks.length > 0)
      holder =
        withTracks
          .filter(({ playlist }) => playlist.specialKind !== LIBRARY_PLAYLIST_KIND)
          .sort((a, b) => a.tracks.length - b.tracks.length)[0] ?? withTracks[0]
      console.info(
        `playlists listed: ${String(read.length)}, track counts: ` +
          `${read.map(({ tracks }) => String(tracks.length)).join(', ')}; ` +
          `holder found: ${String(holder !== undefined)}, ` +
          `holder is the library playlist: ${String(holder?.playlist.specialKind === LIBRARY_PLAYLIST_KIND)}`
      )
    }, SCAN_TIMEOUT_MS)

    it(
      'gets and resolves the first track of a playlist within that playlist',
      async () => {
        if (holder === undefined) return
        const playlistId = holder.playlist.persistentID
        const first = holder.tracks[0]
        if (first === undefined) return

        const got = await music.tracks.get(playlistId, first.persistentID)
        expect(got.persistentID === first.persistentID).toBe(true)

        const resolved = await bindReference(
          music,
          within(first.persistentID, playlistId)
        ).resolve()
        expect(persistentIdOf(resolved) === first.persistentID).toBe(true)
      },
      LIVE_TEST_TIMEOUT_MS
    )

    it(
      'finds no track within a playlist that does not hold it',
      async (context) => {
        if (holder === undefined) return
        const chosen = holder
        const first = chosen.tracks[0]
        if (first === undefined) return

        // Tracks other playlists hold and the chosen one does not, one per playlist.
        const foreign = listed
          .filter((entry) => entry !== chosen)
          .flatMap(({ tracks }) => tracks.find((track) => !chosen.holds(track.persistentID)) ?? [])
        // Playlists that do not hold the chosen playlist's first track, empty ones included.
        const lacking = listed.filter((entry) => !entry.holds(first.persistentID))
        console.info(
          `foreign tracks: ${String(foreign.length)}, ` +
            `playlists lacking the first track: ${String(lacking.length)}, ` +
            `empty playlists: ${String(listed.filter(({ tracks }) => tracks.length === 0).length)}`
        )
        // A library with no such pair (only the library playlist, say) cannot
        // exercise this case. The test is reported as skipped, so it is never
        // counted as passing without checking anything.
        if (foreign.length + lacking.length === 0) {
          context.skip('no playlist lacks a track that another playlist holds')
          return
        }

        const cases = [
          ...foreign.map((track) => [track.persistentID, chosen.playlist.persistentID] as const),
          ...lacking.map(({ playlist }) => [first.persistentID, playlist.persistentID] as const),
        ]
        for (const [persistentID, playlistId] of cases) {
          expect(await outcomeOf(() => music.tracks.get(playlistId, persistentID))).toBe(
            'TargetNotFoundError naming Track'
          )
          expect(
            await outcomeOf(() => bindReference(music, within(persistentID, playlistId)).resolve())
          ).toBe('TargetNotFoundError naming Track')
        }
      },
      LIVE_TEST_TIMEOUT_MS
    )

    it(
      'finds no playlist for a playlist id no playlist has',
      async () => {
        const first = holder?.tracks[0]
        if (first === undefined) return
        expect(listed.some(({ playlist }) => playlist.persistentID === MISSING_PLAYLIST_ID)).toBe(
          false
        )

        expect(
          await outcomeOf(() => music.tracks.get(MISSING_PLAYLIST_ID, first.persistentID))
        ).toBe('TargetNotFoundError naming Playlist')
        expect(
          await outcomeOf(() =>
            bindReference(music, within(first.persistentID, MISSING_PLAYLIST_ID)).resolve()
          )
        ).toBe('TargetNotFoundError naming Playlist')
      },
      LIVE_TEST_TIMEOUT_MS
    )

    it(
      'gets and resolves a persistent ID repeated within a playlist to its first entry',
      async () => {
        let repeated = 0
        for (const { playlist, tracks } of listed) {
          const counts = new Map<string, number>()
          for (const { persistentID } of tracks) {
            counts.set(persistentID, (counts.get(persistentID) ?? 0) + 1)
          }
          const repeats = [...counts].filter(([, count]) => count > 1)
          repeated += repeats.length
          const sample = repeats[0]?.[0]
          if (sample === undefined) continue
          const entries = tracks.filter(({ persistentID }) => persistentID === sample)

          const got = await music.tracks.get(playlist.persistentID, sample)
          expect(got.persistentID === sample).toBe(true)
          expect(entryIdOf(got) === entryIdOf(entries[0])).toBe(true)

          const resolved = await bindReference(
            music,
            within(sample, playlist.persistentID)
          ).resolve()
          expect(persistentIdOf(resolved) === sample).toBe(true)
          expect(entryIdOf(resolved) === entryIdOf(entries[0])).toBe(true)
        }
        console.info(`persistent IDs repeated within one playlist: ${String(repeated)}`)
      },
      LIVE_TEST_TIMEOUT_MS
    )

    it(
      'identifies a track by one hexadecimal persistent ID in every playlist',
      () => {
        const ids = listed.flatMap(({ tracks }) => tracks.map(({ persistentID }) => persistentID))
        const library = listed.find(
          ({ playlist }) => playlist.specialKind === LIBRARY_PLAYLIST_KIND
        )
        const lengths = [...new Set(ids.map((id) => id.length))]
        const outsideLibrary =
          library === undefined
            ? []
            : listed.filter((entry) => entry !== library).flatMap(({ tracks }) => tracks)
        const sameEntryId = outsideLibrary.filter((track) =>
          library?.tracks.some(
            (entry) => entry.persistentID === track.persistentID && entry.id === track.id
          )
        ).length
        console.info(
          `track entries: ${String(ids.length)}, persistent ID lengths: ${lengths.join(', ')}; ` +
            `entries outside the library playlist: ${String(outsideLibrary.length)}, ` +
            `with the numeric id of their library entry: ${String(sameEntryId)}`
        )

        expect(ids.every(isHexId)).toBe(true)
        if (library === undefined) return
        expect(outsideLibrary.every(({ persistentID }) => library.holds(persistentID))).toBe(true)
      },
      LIVE_TEST_TIMEOUT_MS
    )
  }
)
