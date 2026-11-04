/**
 * PlaylistWindow client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { PlaylistWindow } from '../types.js'

/**
 * Client for a sub-window showing a single playlist.
 */
export class PlaylistWindowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all playlist windows, as one page.
   */
  async list(): Promise<Page<PlaylistWindow>> {
    return this.#http.rpc<Page<PlaylistWindow>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a playlist window by id.
   */
  async get(id: string): Promise<PlaylistWindow> {
    return this.#http.rpc<PlaylistWindow>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
