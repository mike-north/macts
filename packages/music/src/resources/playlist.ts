/**
 * Playlist client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all playlists, as one page.
   */
  async list(): Promise<Page<Playlist>> {
    return this.#http.rpc<Page<Playlist>>(`${this.#app}.${this.#resource}.list`)
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
  async move(persistentID: string, to: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.move`, { persistentID, to })
  }

  /**
   * search a playlist for tracks matching the search string. Identical to entering search text in the Search field.
   */
  async search(persistentID: string, _for: string, only?: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.search`, {
      persistentID,
      for: _for,
      only,
    })
  }
}
