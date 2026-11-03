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

/**
 * The type of the resource table of {@link spotifyContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), and the operations that resolve
 * references to it. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type SpotifyResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link SpotifyResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies SpotifyResources

const appNextTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.nextTrack',
  permission: 'spotify:app:nextTrack',
  target: { command: 'nextTrack' },
  description: 'Skip to the next track.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPreviousTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.previousTrack',
  permission: 'spotify:app:previousTrack',
  target: { command: 'previousTrack' },
  description: 'Skip to the previous track.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPlaypauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.playpause',
  permission: 'spotify:app:playpause',
  target: { command: 'playpause' },
  description: 'Toggle play/pause.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.pause',
  permission: 'spotify:app:pause',
  target: { command: 'pause' },
  description: 'Pause playback.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPlayOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'spotify.app.play',
  permission: 'spotify:app:play',
  target: { command: 'play' },
  description: 'Resume playback.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { inContext: { type: 'string', description: 'the URI of the context to play in' } },
    additionalProperties: false,
  },
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
export const spotifyContract: AppContract<SpotifyClient, SpotifyResources> = {
  app: 'spotify',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
