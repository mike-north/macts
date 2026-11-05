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
  bind<Client extends ClientBrand<PhotosResources>>(client: Client): void {
    const contract: AppContract<Client, PhotosResources> = {
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
      const legacy = new PhotosError(
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
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface PhotosClient extends ClientBrand<PhotosResources> {}

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
    files: string[],
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
    mediaItems: string[],
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
    mediaItems: string[],
    to: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('photos.app.add', { mediaItems, to }, __mactsOptions)
  }

  /**
   * Display an ad-hoc slide show from a list of media items
   */
  async startSlideshow(
    using: string[],
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
