/**
 * MediaItem client for Photos SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all media items, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<MediaItem>> {
    return this.#http.invoke<Page<MediaItem>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'MediaItem'
    )
  }

  /**
   * Get a media item by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<MediaItem> {
    return this.#http.invoke<MediaItem>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'MediaItem'
    )
  }

  /**
   * Duplicate a media item
   */
  async duplicate(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.duplicate`,
      { id },
      __mactsOptions,
      'MediaItem'
    )
  }
}
