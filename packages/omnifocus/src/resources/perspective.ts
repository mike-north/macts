/**
 * Perspective client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Perspective } from '../types.js'

/**
 * Client for a saved view or filter configuration.
 */
export class PerspectiveResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List perspectives, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Perspective[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Perspective[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a perspective by id.
   */
  async get(id: string): Promise<Perspective> {
    return this.#http.rpc<Perspective>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
