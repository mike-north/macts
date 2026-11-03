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
   * List settings sets, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: SettingsSet[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: SettingsSet[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a settings set by name.
   */
  async get(name: string): Promise<SettingsSet> {
    return this.#http.rpc<SettingsSet>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
