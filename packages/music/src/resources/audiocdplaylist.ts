/**
 * AudioCDPlaylist client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  AudioCDPlaylist,
  AudioCDPlaylistCreateInput,
  AudioCDPlaylistUpdateInput,
} from '../types.js'

/**
 * Client for a playlist representing an audio cd.
 */
export class AudioCDPlaylistResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all audiocdplaylists.
   */
  async list(): Promise<AudioCDPlaylist[]> {
    return this.#http.rpc<AudioCDPlaylist[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a audiocdplaylist by id.
   */
  async get(id: string): Promise<AudioCDPlaylist> {
    return this.#http.rpc<AudioCDPlaylist>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new audiocdplaylist.
   */
  async create(input: AudioCDPlaylistCreateInput): Promise<AudioCDPlaylist> {
    return this.#http.rpc<AudioCDPlaylist>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing audiocdplaylist.
   */
  async update(id: string, input: AudioCDPlaylistUpdateInput): Promise<AudioCDPlaylist> {
    return this.#http.rpc<AudioCDPlaylist>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a audiocdplaylist.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
