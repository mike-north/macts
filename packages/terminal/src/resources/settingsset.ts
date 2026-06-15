/**
 * SettingsSet client for Terminal SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { SettingsSet } from '../types.js'

/**
 * Client for a terminal settings set (profile).
 */
export class SettingsSetResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all settingssets.
   */
  async list(): Promise<SettingsSet[]> {
    return this.#http.rpc<SettingsSet[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a settingsset by name.
   */
  async get(name: string): Promise<SettingsSet> {
    return this.#http.rpc<SettingsSet>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
