/**
 * Track client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Track } from '../types.js'

/**
 * Client for playable audio source.
 */
export class TrackResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the tracks of one playlist, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    playlistId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Track[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Track[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        playlistId,
      }
    )
  }

  /**
   * Get a track by persistentID within a parent scope.
   */
  async get(playlistId: string, persistentID: string): Promise<Track> {
    return this.#http.rpc<Track>(`${this.#app}.${this.#resource}.get`, { playlistId, persistentID })
  }
}
