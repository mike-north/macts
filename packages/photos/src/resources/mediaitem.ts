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
  async list(): Promise<Page<MediaItem>> {
    return this.#http.rpc<Page<MediaItem>>(`${this.#app}.${this.#resource}.list`)
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
