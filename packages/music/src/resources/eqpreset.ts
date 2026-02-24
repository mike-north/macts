/**
 * EQPreset client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { EQPreset, EQPresetCreateInput, EQPresetUpdateInput } from '../types.js'

/**
 * Client for equalizer preset configuration.
 */
export class EQPresetResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all eqpresets.
   */
  async list(): Promise<EQPreset[]> {
    return this.#http.rpc<EQPreset[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a eqpreset by id.
   */
  async get(id: string): Promise<EQPreset> {
    return this.#http.rpc<EQPreset>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new eqpreset.
   */
  async create(input: EQPresetCreateInput): Promise<EQPreset> {
    return this.#http.rpc<EQPreset>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing eqpreset.
   */
  async update(id: string, input: EQPresetUpdateInput): Promise<EQPreset> {
    return this.#http.rpc<EQPreset>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a eqpreset.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
