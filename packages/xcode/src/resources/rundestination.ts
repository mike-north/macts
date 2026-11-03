/**
 * RunDestination client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { RunDestination } from '../types.js'

/**
 * Client for an object which specifies parameters such as the device and architecture for which to perform a scheme action.
 */
export class RunDestinationResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List run destinations, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    workspaceName: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: RunDestination[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: RunDestination[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        workspaceName,
      }
    )
  }

  /**
   * Get a run destination by name.
   */
  async get(name: string): Promise<RunDestination> {
    return this.#http.rpc<RunDestination>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
