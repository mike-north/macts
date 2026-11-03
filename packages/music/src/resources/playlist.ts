/**
 * Playlist client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Playlist } from '../types.js'

/**
 * Client for a list of tracks/streams.
 */
export class PlaylistResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List playlists, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Playlist[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Playlist[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a playlist by persistentID.
   */
  async get(persistentID: string): Promise<Playlist> {
    return this.#http.rpc<Playlist>(`${this.#app}.${this.#resource}.get`, { persistentID })
  }

  /**
   * Move playlist(s) to a new location
   */
  async move(to: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.move`, { to })
  }

  /**
   * search a playlist for tracks matching the search string. Identical to entering search text in the Search field.
   */
  async search(_for: string, only?: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.search`, { for: _for, only })
  }
}
