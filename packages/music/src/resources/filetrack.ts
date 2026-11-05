/**
 * FileTrack client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

/**
 * Client for a track representing an audio file (mp3, aiff, etc.).
 */
export class FileTrackResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * update file track information from the current information in the track’s file
   */
  async refresh(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(`${this.#app}.${this.#resource}.refresh`, {}, __mactsOptions)
  }
}
