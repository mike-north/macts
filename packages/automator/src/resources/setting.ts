/**
 * Setting client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Setting } from '../types.js'

/**
 * Client for a named value in an action.
 */
export class SettingResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all settings.
   */
  async list(): Promise<Setting[]> {
    return this.#http.rpc<Setting[]>(`${this.#app}.${this.#resource}.listSettings`)
  }

  /**
   * Get a setting by name.
   */
  async get(name: string): Promise<Setting> {
    return this.#http.rpc<Setting>(`${this.#app}.${this.#resource}.getSetting`, { name })
  }
}
