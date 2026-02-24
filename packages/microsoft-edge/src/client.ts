/**
 * MicrosoftEdge HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WindowResourceClient } from './resources/window.js'
import { TabResourceClient } from './resources/tab.js'
import { BookmarkFolderResourceClient } from './resources/bookmarkfolder.js'
import { BookmarkItemResourceClient } from './resources/bookmarkitem.js'

/**
 * Client configuration options.
 */
export interface MicrosoftEdgeClientOptions {
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
      throw new MicrosoftEdgeError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for MicrosoftEdge API errors.
 */
export class MicrosoftEdgeError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MicrosoftEdgeError'
    this.code = code
  }
}

/**
 * MicrosoftEdge client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new MicrosoftEdgeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class MicrosoftEdgeClient {
  readonly #httpClient: HttpClient

  /** A window. */
  readonly windows: WindowResourceClient

  /** A tab. */
  readonly tabs: TabResourceClient

  /** A bookmarks folder that contains other bookmarks folder and bookmark items. */
  readonly bookmarkfolders: BookmarkFolderResourceClient

  /** An item consists of an URL and the title of a bookmark */
  readonly bookmarkitems: BookmarkItemResourceClient

  constructor(options: MicrosoftEdgeClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.windows = new WindowResourceClient(this.#httpClient, 'microsoft-edge', 'windows')
    this.tabs = new TabResourceClient(this.#httpClient, 'microsoft-edge', 'tabs')
    this.bookmarkfolders = new BookmarkFolderResourceClient(
      this.#httpClient,
      'microsoft-edge',
      'bookmarkfolders'
    )
    this.bookmarkitems = new BookmarkItemResourceClient(
      this.#httpClient,
      'microsoft-edge',
      'bookmarkitems'
    )
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }
}
