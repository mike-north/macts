/**
 * Track client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
  async list(
    playlistId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Track>> {
    return this.#http.invoke<Page<Track>>(
      `${this.#app}.${this.#resource}.list`,
      { playlistId },
      __mactsOptions,
      'Track'
    )
  }

  /**
   * Get a track by persistentID within a parent scope.
   * When several tracks share the same persistent ID, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    playlistId: string,
    persistentID: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Track> {
    return this.#http.invoke<Track>(
      `${this.#app}.${this.#resource}.get`,
      { playlistId, persistentID },
      __mactsOptions,
      'Track'
    )
  }
}
