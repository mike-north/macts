/**
 * TV HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { BrowserWindowResourceClient } from './resources/browserwindow.js'
import { FileTrackResourceClient } from './resources/filetrack.js'
import { PlaylistResourceClient } from './resources/playlist.js'
import { PlaylistWindowResourceClient } from './resources/playlistwindow.js'
import { SourceResourceClient } from './resources/source.js'
import { tvContract as appContract } from './contract/index.js'
import {
  createCodecClient,
  createRemoteTransport,
  type RemoteTransport,
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
import type { TVResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface TVClientOptions {
  /** API key for authentication */
  apiKey: string
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string
}

/** Canonical failures retained privately while raw RPC preserves the legacy error class. */
const canonicalFailures = new WeakMap<Error, MactsError>()

/** Raw RPC compatibility and canonical typed invocation for this app and credential. */
export class HttpClient {
  readonly #transport: RemoteTransport
  #runtime: ClientRuntime | undefined

  constructor(baseUrl: string, apiKey: string) {
    this.#transport = createRemoteTransport(appContract, { url: baseUrl, token: apiKey })
  }

  /**
   * Bind the actual public facade in the shared reference registry. Standalone
   * resource clients lazily bind an ordinary contract client instead. A copied
   * contract changes only construction; its descriptors and codecs are shared.
   * @internal
   */
  bind(client?: object): void {
    const contract: AppContract<object, TVResources> = {
      ...appContract,
      bind: (runtime) => {
        this.#runtime = runtime
        return client ?? appContract.bind(runtime)
      },
    }
    createCodecClient(contract, {
      invoke: async (operation, input, options) => {
        try {
          return await this.rpc(operation, input as object, options)
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

  /** Invoke a descriptor with SDK input; generated return types come from that contract and its output codec validates the result. @internal */
  async invoke<T>(
    path: string,
    input: object = {},
    options?: CallOptions,
    expectedResource?: string
  ): Promise<T> {
    const operation = Object.values(appContract.operations).find(
      (candidate) => candidate.id === path
    )
    if (
      operation === undefined ||
      operation.unavailable !== undefined ||
      (expectedResource !== undefined && operation.target.resource !== expectedResource)
    ) {
      throw new ValidationError('The operation is not registered in this app contract.', {
        issues: [{ path: [], message: 'Unknown or mismatched operation route.' }],
      })
    }
    if (this.#runtime === undefined) this.bind()
    if (this.#runtime === undefined) throw new Error('Client runtime was not initialized.')
    return this.#runtime.invoke(operation, input, options) as Promise<T>
  }

  /** Raw wire RPC for explicit passthrough consumers; typed methods use invoke. */
  async rpc<T>(path: string, body: object = {}, options?: CallOptions): Promise<T> {
    // Typed wrappers dispatch through this public hook, including overrides
    // that forward only two arguments. Shared protocol handling needs no hidden
    // request metadata; forwarding options preserves cancellation only.
    const outcome = await this.#transport.requestRpc(
      path as OperationId,
      body as WireValue,
      options
    )
    if (outcome.ok) return outcome.result as T
    const error = outcome.envelope as { error?: { code?: string; message?: string } } | null
    const legacy = new TVError(
      error?.error?.code ?? 'UNKNOWN_ERROR',
      error?.error?.message ?? `HTTP ${String(outcome.status)}`
    )
    canonicalFailures.set(
      legacy,
      fromWireErrorEnvelope(outcome.envelope, { status: outcome.status })
    )
    throw legacy
  }
}

/**
 * Error class for TV API errors.
 */
export class TVError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TVError'
    this.code = code
  }
}

/**
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface TVClient extends ClientBrand<TVResources> {}

/**
 * TV client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new TVClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class TVClient {
  readonly #httpClient: HttpClient

  /** the main window */
  readonly browserWindows: BrowserWindowResourceClient

  /** a track representing a video file */
  readonly fileTracks: FileTrackResourceClient

  /** a list of tracks/streams */
  readonly playlists: PlaylistResourceClient

  /** a sub-window showing a single playlist */
  readonly playlistWindows: PlaylistWindowResourceClient

  /** a media source (library, CD, device, etc.) */
  readonly sources: SourceResourceClient

  constructor(options: TVClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.browserWindows = new BrowserWindowResourceClient(this.#httpClient, 'tv', 'browserWindows')
    this.fileTracks = new FileTrackResourceClient(this.#httpClient, 'tv', 'fileTracks')
    this.playlists = new PlaylistResourceClient(this.#httpClient, 'tv', 'playlists')
    this.playlistWindows = new PlaylistWindowResourceClient(
      this.#httpClient,
      'tv',
      'playlistWindows'
    )
    this.sources = new SourceResourceClient(this.#httpClient, 'tv', 'sources')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Close an object
   */
  async close(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.close', {}, __mactsOptions)
  }

  /**
   * Return the number of elements of a particular class within an object
   */
  async count(
    each: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.count', { each }, __mactsOptions)
  }

  /**
   * Duplicate one or more object(s)
   */
  async duplicate(
    to?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.duplicate', { to }, __mactsOptions)
  }

  /**
   * Verify if an object exists
   */
  async exists(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.exists', {}, __mactsOptions)
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
      'tv.app.make',
      { new: _new, at, withProperties },
      __mactsOptions
    )
  }

  /**
   * Open the specified object(s)
   */
  async open(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.open', {}, __mactsOptions)
  }

  /**
   * Run the application
   */
  async run(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.run', {}, __mactsOptions)
  }

  /**
   * Quit the application
   */
  async quit(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.quit', {}, __mactsOptions)
  }

  /**
   * Save the specified object(s)
   */
  async save(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.save', {}, __mactsOptions)
  }

  /**
   * add one or more files to a playlist
   */
  async add(to?: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.add', { to }, __mactsOptions)
  }

  /**
   * reposition to beginning of current track or go to previous track if already at start of current track
   */
  async backTrack(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.backTrack', {}, __mactsOptions)
  }

  /**
   * convert one or more files or tracks
   */
  async convert(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.convert', {}, __mactsOptions)
  }

  /**
   * download a cloud track or playlist
   */
  async download(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.download', {}, __mactsOptions)
  }

  /**
   * skip forward in a playing track
   */
  async fastForward(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.fastForward', {}, __mactsOptions)
  }

  /**
   * advance to the next track in the current playlist
   */
  async nextTrack(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.nextTrack', {}, __mactsOptions)
  }

  /**
   * pause playback
   */
  async pause(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.pause', {}, __mactsOptions)
  }

  /**
   * play the current track or the specified track or file.
   */
  async play(
    once?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.play', { once }, __mactsOptions)
  }

  /**
   * toggle the playing/paused state of the current track
   */
  async playpause(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.playpause', {}, __mactsOptions)
  }

  /**
   * return to the previous track in the current playlist
   */
  async previousTrack(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.previousTrack', {}, __mactsOptions)
  }

  /**
   * disable fast forward/rewind and resume playback, if playing.
   */
  async resume(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.resume', {}, __mactsOptions)
  }

  /**
   * reveal and select a track or playlist
   */
  async reveal(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.reveal', {}, __mactsOptions)
  }

  /**
   * skip backwards in a playing track
   */
  async rewind(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.rewind', {}, __mactsOptions)
  }

  /**
   * select the specified object(s)
   */
  async select(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.select', {}, __mactsOptions)
  }

  /**
   * stop playback
   */
  async stop(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.stop', {}, __mactsOptions)
  }

  /**
   * Opens an iTunes Store or stream URL
   */
  async openLocation(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('tv.app.openLocation', {}, __mactsOptions)
  }
}
