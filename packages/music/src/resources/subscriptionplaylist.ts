/**
 * SubscriptionPlaylist client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  SubscriptionPlaylist,
  SubscriptionPlaylistCreateInput,
  SubscriptionPlaylistUpdateInput,
} from '../types.js'

/**
 * Client for a subscription playlist from apple music.
 */
export class SubscriptionPlaylistResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all subscriptionplaylists.
   */
  async list(): Promise<SubscriptionPlaylist[]> {
    return this.#http.rpc<SubscriptionPlaylist[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a subscriptionplaylist by id.
   */
  async get(id: string): Promise<SubscriptionPlaylist> {
    return this.#http.rpc<SubscriptionPlaylist>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new subscriptionplaylist.
   */
  async create(input: SubscriptionPlaylistCreateInput): Promise<SubscriptionPlaylist> {
    return this.#http.rpc<SubscriptionPlaylist>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing subscriptionplaylist.
   */
  async update(id: string, input: SubscriptionPlaylistUpdateInput): Promise<SubscriptionPlaylist> {
    return this.#http.rpc<SubscriptionPlaylist>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a subscriptionplaylist.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
