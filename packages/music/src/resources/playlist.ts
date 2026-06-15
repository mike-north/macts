/**
 * Playlist client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

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
