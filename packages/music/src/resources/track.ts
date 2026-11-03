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
   * List the tracks of one playlist, as one page.
   */
  async list(playlistId: string): Promise<{ items: Track[] }> {
    return this.#http.rpc<{ items: Track[] }>(`${this.#app}.${this.#resource}.list`, { playlistId })
  }

  /**
   * Get a track by persistentID within a parent scope.
   */
  async get(playlistId: string, persistentID: string): Promise<Track> {
    return this.#http.rpc<Track>(`${this.#app}.${this.#resource}.get`, { playlistId, persistentID })
  }
}
