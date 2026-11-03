/**
 * SettingsSet client for Terminal SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all settings sets, as one page.
   */
  async list(): Promise<Page<SettingsSet>> {
    return this.#http.rpc<Page<SettingsSet>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a settings set by name.
   */
  async get(name: string): Promise<SettingsSet> {
    return this.#http.rpc<SettingsSet>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
