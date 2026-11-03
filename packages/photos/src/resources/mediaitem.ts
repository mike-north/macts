/**
 * MediaItem client for Photos SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { MediaItem } from '../types.js'

/**
 * Client for a media item, such as a photo or video.
 */
export class MediaItemResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List media items, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: MediaItem[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: MediaItem[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a media item by id.
   */
  async get(id: string): Promise<MediaItem> {
    return this.#http.rpc<MediaItem>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Duplicate a media item
   */
  async duplicate(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.duplicate`, { id })
  }
}
