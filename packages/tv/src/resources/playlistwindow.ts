/**
 * PlaylistWindow client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  PlaylistWindow,
  PlaylistWindowCreateInput,
  PlaylistWindowUpdateInput,
} from '../types.js'

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
   * List all playlistwindows.
   */
  async list(): Promise<PlaylistWindow[]> {
    return this.#http.rpc<PlaylistWindow[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a playlistwindow by id.
   */
  async get(id: string): Promise<PlaylistWindow> {
    return this.#http.rpc<PlaylistWindow>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new playlistwindow.
   */
  async create(input: PlaylistWindowCreateInput): Promise<PlaylistWindow> {
    return this.#http.rpc<PlaylistWindow>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing playlistwindow.
   */
  async update(id: string, input: PlaylistWindowUpdateInput): Promise<PlaylistWindow> {
    return this.#http.rpc<PlaylistWindow>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a playlistwindow.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
