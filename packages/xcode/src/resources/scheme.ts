/**
 * Scheme client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Scheme } from '../types.js'

/**
 * Client for a set of parameters for building, testing, launching or distributing the products of a workspace.
 */
export class SchemeResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List schemes, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    workspaceName: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Scheme[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Scheme[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        workspaceName,
      }
    )
  }

  /**
   * Get a scheme by id.
   */
  async get(id: string): Promise<Scheme> {
    return this.#http.rpc<Scheme>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
