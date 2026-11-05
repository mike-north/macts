/**
 * Photos HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { MediaItemResourceClient } from './resources/mediaitem.js'
import { AlbumResourceClient } from './resources/album.js'
import { FolderResourceClient } from './resources/folder.js'
import { photosContract as appContract } from './contract/index.js'
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
import type { PhotosResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface PhotosClientOptions {
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
    const contract: AppContract<object, PhotosResources> = {
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
    const legacy = new PhotosError(
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
 * Error class for Photos API errors.
 */
export class PhotosError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'PhotosError'
    this.code = code
  }
}

/**
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface PhotosClient extends ClientBrand<PhotosResources> {}

/**
 * Photos client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new PhotosClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class PhotosClient {
  readonly #httpClient: HttpClient

  /** A media item, such as a photo or video */
  readonly mediaItems: MediaItemResourceClient

  /** An album. A container that holds media items */
  readonly albums: AlbumResourceClient

  /** A folder. A container that holds albums and other folders, but not media items */
  readonly folders: FolderResourceClient

  constructor(options: PhotosClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.mediaItems = new MediaItemResourceClient(this.#httpClient, 'photos', 'mediaItems')
    this.albums = new AlbumResourceClient(this.#httpClient, 'photos', 'albums')
    this.folders = new FolderResourceClient(this.#httpClient, 'photos', 'folders')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Import files into the library
   */
  async _import(
    files: Parameters<import('./contract/index.js').PhotosClient['_import']>[0],
    into?: string,
    skipCheckDuplicates?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'photos.app.import',
      { files, into, skipCheckDuplicates },
      __mactsOptions
    )
  }

  /**
   * Export media items to the specified location as files
   */
  async _export(
    mediaItems: Parameters<import('./contract/index.js').PhotosClient['_export']>[0],
    to: string,
    usingOriginals?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'photos.app.export',
      { mediaItems, to, usingOriginals },
      __mactsOptions
    )
  }

  /**
   * Create a new album or folder
   */
  async make(
    _new: string,
    named?: string,
    at?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'photos.app.make',
      { new: _new, named, at },
      __mactsOptions
    )
  }

  /**
   * Delete an album or folder
   */
  async _delete(
    target: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.delete', { target }, __mactsOptions)
  }

  /**
   * Add media items to an album
   */
  async add(
    mediaItems: Parameters<import('./contract/index.js').PhotosClient['add']>[0],
    to: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.add', { mediaItems, to }, __mactsOptions)
  }

  /**
   * Display an ad-hoc slide show from a list of media items
   */
  async startSlideshow(
    using: Parameters<import('./contract/index.js').PhotosClient['startSlideshow']>[0],
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.startSlideshow', { using }, __mactsOptions)
  }

  /**
   * End the currently-playing slideshow
   */
  async stopSlideshow(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.stopSlideshow', {}, __mactsOptions)
  }

  /**
   * Skip to next slide in currently-playing slideshow
   */
  async nextSlide(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.nextSlide', {}, __mactsOptions)
  }

  /**
   * Skip to previous slide in currently-playing slideshow
   */
  async previousSlide(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.previousSlide', {}, __mactsOptions)
  }

  /**
   * Pause the currently-playing slideshow
   */
  async pauseSlideshow(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.pauseSlideshow', {}, __mactsOptions)
  }

  /**
   * Resume the currently-playing slideshow
   */
  async resumeSlideshow(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.resumeSlideshow', {}, __mactsOptions)
  }

  /**
   * Show the image at path in the application
   */
  async spotlight(
    target: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.spotlight', { target }, __mactsOptions)
  }

  /**
   * Search for items matching the search string
   */
  async search(
    _for: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.search', { for: _for }, __mactsOptions)
  }
}
