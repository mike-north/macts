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
   * List settings, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    actionId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Setting[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Setting[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        actionId,
      }
    )
  }
}
