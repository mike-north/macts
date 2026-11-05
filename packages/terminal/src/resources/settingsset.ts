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
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<SettingsSet>> {
    return this.#http.invoke<Page<SettingsSet>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'SettingsSet'
    )
  }

  /**
   * Get a settings set by name.
   * When several settings sets share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<SettingsSet> {
    return this.#http.invoke<SettingsSet>(
      `${this.#app}.${this.#resource}.get`,
      { name },
      __mactsOptions,
      'SettingsSet'
    )
  }
}
