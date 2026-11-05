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
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Playlist>> {
    return this.#http.invoke<Page<Playlist>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Playlist'
    )
  }

  /**
   * Get a playlist by persistentID.
   */
  async get(
    persistentID: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Playlist> {
    return this.#http.invoke<Playlist>(
      `${this.#app}.${this.#resource}.get`,
      { persistentID },
      __mactsOptions,
      'Playlist'
    )
  }

  /**
   * Move playlist(s) to a new location
   */
  async move(
    persistentID: string,
    to: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.move`,
      { persistentID, to },
      __mactsOptions,
      'Playlist'
    )
  }

  /**
   * search a playlist for tracks matching the search string. Identical to entering search text in the Search field.
   */
  async search(
    persistentID: string,
    _for: string,
    only?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.search`,
      { persistentID, for: _for, only },
      __mactsOptions,
      'Playlist'
    )
  }
}
