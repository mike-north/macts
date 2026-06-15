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
   * List all mediaitems.
   */
  async list(): Promise<MediaItem[]> {
    return this.#http.rpc<MediaItem[]>(`${this.#app}.${this.#resource}.listMediaItems`)
  }

  /**
   * Get a mediaitem by id.
   */
  async get(id: string): Promise<MediaItem> {
    return this.#http.rpc<MediaItem>(`${this.#app}.${this.#resource}.getMediaItem`, { id })
  }

  /**
   * Duplicate a media item
   */
  async duplicate(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.duplicate`, { id })
  }
}
