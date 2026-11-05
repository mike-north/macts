/**
 * Playlist client for TV SDK.
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
   * List the playlists of one source, as one page.
   */
  async list(sourceId: string): Promise<Page<Playlist>> {
    return this.#http.rpc<Page<Playlist>>(`${this.#app}.${this.#resource}.list`, { sourceId })
  }

  /**
   * Get a playlist by persistentID within a parent scope.
   */
  async get(sourceId: string, persistentID: string): Promise<Playlist> {
    return this.#http.rpc<Playlist>(`${this.#app}.${this.#resource}.get`, {
      sourceId,
      persistentID,
    })
  }

  /**
   * Move playlist(s) to a new location
   */
  async move(sourceId: string, persistentID: string, to: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.move`, {
      sourceId,
      persistentID,
      to,
    })
  }

  /**
   * search a playlist for tracks matching the search string. Identical to entering search text in the Search field.
   */
  async search(sourceId: string, persistentID: string, _for: string, only?: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.search`, {
      sourceId,
      persistentID,
      for: _for,
      only,
    })
  }
}
