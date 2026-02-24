/**
 * MediaItem client for Photos SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { MediaItem, MediaItemCreateInput, MediaItemUpdateInput } from '../types.js'

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
    return this.#http.rpc<MediaItem[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a mediaitem by id.
   */
  async get(id: string): Promise<MediaItem> {
    return this.#http.rpc<MediaItem>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new mediaitem.
   */
  async create(input: MediaItemCreateInput): Promise<MediaItem> {
    return this.#http.rpc<MediaItem>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing mediaitem.
   */
  async update(id: string, input: MediaItemUpdateInput): Promise<MediaItem> {
    return this.#http.rpc<MediaItem>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a mediaitem.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }

  /**
   * Duplicate a media item
   */
  async duplicate(id: string): Promise<void> {
    await this.#http.rpc<undefined>('photos.mediaitems.duplicate', { id })
  }
}
