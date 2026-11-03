/**
 * Scheme client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List the schemes of one workspace document, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    workspaceName: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<Page<Scheme>> {
    return this.#http.rpc<Page<Scheme>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      workspaceName,
    })
  }

  /**
   * Get a scheme by id.
   */
  async get(id: string): Promise<Scheme> {
    return this.#http.rpc<Scheme>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
