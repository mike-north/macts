/**
 * The Spotify contract: the transport-neutral description of every
 * Spotify operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `SpotifyClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `SpotifyClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Spotify manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** PlayerState */
export type PlayerState = 'stopped' | 'playing' | 'paused'

/** The currently playing track */
export interface Track {
  /**
   * The name of the track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The artist of the track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly artist: string | null
  /**
   * The album of the track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly album: string | null
  /**
   * The album artist of the track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly albumArtist: string | null
  /**
   * The disc number of the track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly discNumber: Integer | null
  /**
   * The duration of the track in milliseconds.
   * Nullable. No evidence that the app always sets it.
   */
  readonly duration: Integer | null
  /**
   * Number of times this track has been played.
   * Nullable. No evidence that the app always sets it.
   */
  readonly playedCount: Integer | null
  /**
   * The track number.
   * Nullable. No evidence that the app always sets it.
   */
  readonly trackNumber: Integer | null
  /**
   * The Spotify URL for the track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly spotifyUrl: string | null
  /**
   * The unique identifier of the track.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The URL of the track artwork.
   * Nullable. No evidence that the app always sets it.
   */
  readonly artworkUrl: string | null
  /**
   * The track artwork.
   * Nullable. No evidence that the app always sets it.
   */
  readonly artwork: string | null
  /**
   * The current player state.
   * Nullable. No evidence that the app always sets it.
   */
  readonly playerState: PlayerState | null
}

/** Input for creating a Track. */
export type TrackCreateInput = Record<string, never>

/** Input for updating a Track. Omitted fields are left unchanged. */
export type TrackUpdateInput = Record<string, never>

/**
 * The Spotify client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link spotifyContract}.
 */
export interface SpotifyClient {
  /** Skip to the next track. */
  nextTrack(options?: CallOptions): Promise<void>
  /** Skip to the previous track. */
  previousTrack(options?: CallOptions): Promise<void>
  /** Toggle play/pause. */
  playpause(options?: CallOptions): Promise<void>
  /** Pause playback. */
  pause(options?: CallOptions): Promise<void>
  /** Resume playback. */
  play(options?: CallOptions): Promise<void>
  /**
   * Start playback of a track in the given context.
   *
   * @param inContext - the URI of the context to play in. Does not accept null.
   */
  playTrack(inContext?: string, options?: CallOptions): Promise<void>
}

/** The members of {@link PlayerState}, for its value type. */
const playerStateMembers = ['stopped', 'playing', 'paused'] as const

const trackRecordType: ValueType<Track> = t.record(
  {
    name: t.nullable(t.string(), { description: 'The name of the track' }),
    artist: t.nullable(t.string(), { description: 'The artist of the track' }),
    album: t.nullable(t.string(), { description: 'The album of the track' }),
    albumArtist: t.nullable(t.string(), { description: 'The album artist of the track' }),
    discNumber: t.nullable(t.integer(), { description: 'The disc number of the track' }),
    duration: t.nullable(t.integer(), { description: 'The duration of the track in milliseconds' }),
    playedCount: t.nullable(t.integer(), {
      description: 'Number of times this track has been played',
    }),
    trackNumber: t.nullable(t.integer(), { description: 'The track number' }),
    spotifyUrl: t.nullable(t.string(), { description: 'The Spotify URL for the track' }),
    id: t.string({ description: 'The unique identifier of the track' }),
    artworkUrl: t.nullable(t.string(), { description: 'The URL of the track artwork' }),
    artwork: t.nullable(t.string(), { description: 'The track artwork' }),
    playerState: t.nullable(t.enumeration(playerStateMembers), {
      description: 'The current player state',
    }),
  },
  { description: 'The currently playing track' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<SpotifyClient>['resources'] = {
  Track: {
    name: 'Track',
    record: trackRecordType,
    id: t.string({ description: 'The unique identifier of the track' }),
  },
}

const appNextTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.nextTrack',
  permission: 'spotify:app:nextTrack',
  target: { command: 'nextTrack' },
  description: 'Skip to the next track.',
  input: t.record({}),
  output: t.none(),
}

const appPreviousTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.previousTrack',
  permission: 'spotify:app:previousTrack',
  target: { command: 'previousTrack' },
  description: 'Skip to the previous track.',
  input: t.record({}),
  output: t.none(),
}

const appPlaypauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.playpause',
  permission: 'spotify:app:playpause',
  target: { command: 'playpause' },
  description: 'Toggle play/pause.',
  input: t.record({}),
  output: t.none(),
}

const appPauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.pause',
  permission: 'spotify:app:pause',
  target: { command: 'pause' },
  description: 'Pause playback.',
  input: t.record({}),
  output: t.none(),
}

const appPlayOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.play',
  permission: 'spotify:app:play',
  target: { command: 'play' },
  description: 'Resume playback.',
  input: t.record({}),
  output: t.none(),
}

const appPlayTrackOperation: OperationDescriptor<
  { readonly inContext?: string | undefined },
  undefined
> = {
  id: 'spotify.app.playTrack',
  permission: 'spotify:app:playTrack',
  target: { command: 'playTrack' },
  description: 'Start playback of a track in the given context.',
  input: t.record({
    inContext: t.optional(t.string({ description: 'the URI of the context to play in' })),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<SpotifyClient>['operations'] = {
  'spotify.app.nextTrack': appNextTrackOperation,
  'spotify.app.previousTrack': appPreviousTrackOperation,
  'spotify.app.playpause': appPlaypauseOperation,
  'spotify.app.pause': appPauseOperation,
  'spotify.app.play': appPlayOperation,
  'spotify.app.playTrack': appPlayTrackOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): SpotifyClient {
  return {
    nextTrack: (options) => runtime.invoke(appNextTrackOperation, {}, options),
    previousTrack: (options) => runtime.invoke(appPreviousTrackOperation, {}, options),
    playpause: (options) => runtime.invoke(appPlaypauseOperation, {}, options),
    pause: (options) => runtime.invoke(appPauseOperation, {}, options),
    play: (options) => runtime.invoke(appPlayOperation, {}, options),
    playTrack: (inContext, options) =>
      runtime.invoke(appPlayTrackOperation, { inContext }, options),
  }
}

/**
 * The Spotify contract. Pass it to a client factory to obtain a
 * {@link SpotifyClient}.
 */
export const spotifyContract: AppContract<SpotifyClient> = {
  app: 'spotify',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
