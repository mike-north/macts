/**
 * FileTrack client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

/**
 * Client for a track representing a video file.
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
  async refresh(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.refresh`, {})
  }
}
