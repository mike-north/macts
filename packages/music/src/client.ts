/**
 * Music HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { FileTrackResourceClient } from './resources/filetrack.js'
import { PlaylistResourceClient } from './resources/playlist.js'
import { TrackResourceClient } from './resources/track.js'

import { musicContract as appContract } from './contract/index.js'
import {
  createCodecClient,
  createRemoteTransport,
  type ClientTransport,
} from '@macts/contracts/client'
import {
  MactsError,
  OperationCancelledError,
  TransportError,
  ValidationError,
  fromWireErrorEnvelope,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type OperationId,
  type WireValue,
} from '@macts/contracts'
import type { MusicResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface MusicClientOptions {
  /** API key for authentication */
  apiKey: string
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
/** Canonical failures retained privately while raw RPC preserves the legacy error class. */
const canonicalFailures = new WeakMap<Error, MactsError>()

/**
 * Private request metadata selects the canonical POST while retaining the public
 * raw RPC hook. It never enters the request body or caller-owned options.
 */
const canonicalCall = Symbol('canonical contract call')

export class HttpClient {
  readonly #transport: ClientTransport
  readonly #baseUrl: string
  readonly #apiKey: string
  #runtime: ClientRuntime | undefined

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
    this.#transport = createRemoteTransport(appContract, { url: baseUrl, token: apiKey })
  }

  /**
   * Bind the actual public facade in the shared reference registry. A copied
   * contract changes only construction; its descriptors and codecs are shared.
   * @internal
   */
  bind<Client extends ClientBrand<MusicResources>>(client: Client): void {
    const contract: AppContract<Client, MusicResources> = {
      ...appContract,
      bind: (runtime) => {
        this.#runtime = runtime
        return client
      },
    }
    createCodecClient(contract, {
      invoke: async (operation, input, options) => {
        try {
          const requestOptions: CallOptions & { readonly [canonicalCall]: true } = {
            ...options,
            [canonicalCall]: true,
          }
          return await this.rpc(operation, input as object, requestOptions)
        } catch (error) {
          if (error instanceof MactsError) throw error
          if (error instanceof Error) {
            const canonical = canonicalFailures.get(error)
            if (canonical !== undefined) throw canonical
          }
          if (options?.signal?.aborted === true)
            throw new OperationCancelledError('The operation was cancelled.', {})
          throw new TransportError('The custom RPC transport failed.', { reason: 'unreachable' })
        }
      },
      resolve: this.#transport.resolve,
    })
  }

  /** Invoke a registered operation with SDK input; raw RPC hooks still see wire input. @internal */
  async invoke<T>(path: string, input: object = {}, options?: CallOptions): Promise<T> {
    const operation = Object.values(appContract.operations).find(
      (candidate) => candidate.id === path
    )
    if (operation === undefined || operation.unavailable !== undefined) {
      throw new ValidationError('The operation is not registered in this app contract.', {
        issues: [{ path: [], message: 'Unknown operation route.' }],
      })
    }
    if (this.#runtime === undefined) this.bind({})
    if (this.#runtime === undefined) throw new Error('Client runtime was not initialized.')
    return this.#runtime.invoke(operation, input, options) as Promise<T>
  }

  /** Raw wire RPC for explicit passthrough consumers; typed methods use invoke. */
  async rpc<T>(path: string, body: object = {}, options?: CallOptions): Promise<T> {
    // Typed wrappers still dispatch through overrides; an override forwarding to
    // super retains the shared transport's envelope/cancellation semantics.
    if (options !== undefined && canonicalCall in options) {
      return (await this.#transport.invoke(path as OperationId, body as WireValue, options)) as T
    }
    const response = await fetch(`${this.#baseUrl}/api/v1/rpc/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    })
    if (!response.ok) {
      const envelope: unknown = await response.json()
      const error = envelope as { error?: { code?: string; message?: string } }
      const legacy = new MusicError(
        error.error?.code ?? 'UNKNOWN_ERROR',
        error.error?.message ?? `HTTP ${String(response.status)}`
      )
      canonicalFailures.set(legacy, fromWireErrorEnvelope(envelope, { status: response.status }))
      throw legacy
    }
    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for Music API errors.
 */
export class MusicError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MusicError'
    this.code = code
  }
}

/**
 * Music client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new MusicClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface MusicClient extends ClientBrand<MusicResources> {}

export class MusicClient {
  readonly #httpClient: HttpClient

  /** a track representing an audio file (MP3, AIFF, etc.) */
  readonly fileTracks: FileTrackResourceClient

  /** a list of tracks/streams */
  readonly playlists: PlaylistResourceClient

  /** playable audio source */
  readonly tracks: TrackResourceClient

  constructor(options: MusicClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.fileTracks = new FileTrackResourceClient(this.#httpClient, 'music', 'fileTracks')
    this.playlists = new PlaylistResourceClient(this.#httpClient, 'music', 'playlists')
    this.tracks = new TrackResourceClient(this.#httpClient, 'music', 'tracks')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Print the specified object(s)
   */
  async print(
    printDialog?: boolean,
    withProperties?: string,
    kind?: string,
    theme?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'music.app.print',
      { printDialog, withProperties, kind, theme },
      __mactsOptions
    )
  }

  /**
   * Close an object
   */
  async close(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.close', {}, __mactsOptions)
  }

  /**
   * Return the number of elements of a particular class within an object
   */
  async count(
    each: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.count', { each }, __mactsOptions)
  }

  /**
   * Duplicate one or more object(s)
   */
  async duplicate(
    to?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.duplicate', { to }, __mactsOptions)
  }

  /**
   * Verify if an object exists
   */
  async exists(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.exists', {}, __mactsOptions)
  }

  /**
   * Make a new element
   */
  async make(
    _new: string,
    at?: string,
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'music.app.make',
      { new: _new, at, withProperties },
      __mactsOptions
    )
  }

  /**
   * Open the specified object(s)
   */
  async open(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.open', {}, __mactsOptions)
  }

  /**
   * Run the application
   */
  async run(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.run', {}, __mactsOptions)
  }

  /**
   * Quit the application
   */
  async quit(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.quit', {}, __mactsOptions)
  }

  /**
   * Save the specified object(s)
   */
  async save(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.save', {}, __mactsOptions)
  }

  /**
   * add one or more files to a playlist
   */
  async add(to?: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.add', { to }, __mactsOptions)
  }

  /**
   * reposition to beginning of current track or go to previous track if already at start of current track
   */
  async backTrack(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.backTrack', {}, __mactsOptions)
  }

  /**
   * convert one or more files or tracks
   */
  async convert(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.convert', {}, __mactsOptions)
  }

  /**
   * download a cloud track or playlist
   */
  async download(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.download', {}, __mactsOptions)
  }

  /**
   * export a source or playlist
   */
  async _export(
    as?: string,
    to?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.export', { as, to }, __mactsOptions)
  }

  /**
   * skip forward in a playing track
   */
  async fastForward(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.fastForward', {}, __mactsOptions)
  }

  /**
   * advance to the next track in the current playlist
   */
  async nextTrack(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.nextTrack', {}, __mactsOptions)
  }

  /**
   * pause playback
   */
  async pause(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.pause', {}, __mactsOptions)
  }

  /**
   * play the current track or the specified track or file.
   */
  async play(
    once?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.play', { once }, __mactsOptions)
  }

  /**
   * toggle the playing/paused state of the current track
   */
  async playpause(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.playpause', {}, __mactsOptions)
  }

  /**
   * return to the previous track in the current playlist
   */
  async previousTrack(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.previousTrack', {}, __mactsOptions)
  }

  /**
   * disable fast forward/rewind and resume playback, if playing.
   */
  async resume(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.resume', {}, __mactsOptions)
  }

  /**
   * reveal and select a track or playlist
   */
  async reveal(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.reveal', {}, __mactsOptions)
  }

  /**
   * skip backwards in a playing track
   */
  async rewind(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.rewind', {}, __mactsOptions)
  }

  /**
   * select the specified object(s)
   */
  async select(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.select', {}, __mactsOptions)
  }

  /**
   * stop playback
   */
  async stop(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.stop', {}, __mactsOptions)
  }

  /**
   * Opens an iTunes Store or audio stream URL
   */
  async openLocation(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('music.app.openLocation', {}, __mactsOptions)
  }
}
