/**
 * Tab client for Terminal SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Tab } from '../types.js'

/**
 * Client for a terminal tab.
 */
export class TabResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List tabs, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Tab[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Tab[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a tab by name.
   */
  async get(name: string): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
