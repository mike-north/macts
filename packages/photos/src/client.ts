/**
 * Photos HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { MediaItemResourceClient } from './resources/mediaitem.js'
import { AlbumResourceClient } from './resources/album.js'
import { FolderResourceClient } from './resources/folder.js'

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
export class HttpClient {
  readonly #baseUrl: string
  readonly #apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: { code?: string; message?: string } }
      const code = error.error?.code ?? 'UNKNOWN_ERROR'
      const message = error.error?.message ?? `HTTP ${String(response.status)}`
      throw new PhotosError(code, message)
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
export class PhotosClient {
  readonly #httpClient: HttpClient

  /** A media item, such as a photo or video */
  readonly mediaitems: MediaItemResourceClient

  /** An album. A container that holds media items */
  readonly albums: AlbumResourceClient

  /** A folder. A container that holds albums and other folders, but not media items */
  readonly folders: FolderResourceClient

  constructor(options: PhotosClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.mediaitems = new MediaItemResourceClient(this.#httpClient, 'photos', 'mediaitems')
    this.albums = new AlbumResourceClient(this.#httpClient, 'photos', 'albums')
    this.folders = new FolderResourceClient(this.#httpClient, 'photos', 'folders')
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
  async _import(files: string[], into?: string, skipCheckDuplicates?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.import', { files, into, skipCheckDuplicates })
  }

  /**
   * Export media items to the specified location as files
   */
  async _export(mediaItems: string[], to: string, usingOriginals?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.export', { mediaItems, to, usingOriginals })
  }

  /**
   * Create a new album or folder
   */
  async make(_new: string, named?: string, at?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.make', { new: _new, named, at })
  }

  /**
   * Delete an album or folder
   */
  async _delete(target: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.delete', { target })
  }

  /**
   * Add media items to an album
   */
  async add(mediaItems: string[], to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.add', { mediaItems, to })
  }

  /**
   * Display an ad-hoc slide show from a list of media items
   */
  async startSlideshow(using: string[]): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.startSlideshow', { using })
  }

  /**
   * End the currently-playing slideshow
   */
  async stopSlideshow(): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.stopSlideshow', {})
  }

  /**
   * Skip to next slide in currently-playing slideshow
   */
  async nextSlide(): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.nextSlide', {})
  }

  /**
   * Skip to previous slide in currently-playing slideshow
   */
  async previousSlide(): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.previousSlide', {})
  }

  /**
   * Pause the currently-playing slideshow
   */
  async pauseSlideshow(): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.pauseSlideshow', {})
  }

  /**
   * Resume the currently-playing slideshow
   */
  async resumeSlideshow(): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.resumeSlideshow', {})
  }

  /**
   * Show the image at path in the application
   */
  async spotlight(target: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.spotlight', { target })
  }

  /**
   * Search for items matching the search string
   */
  async search(_for: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('photos.app.search', { for: _for })
  }
}
