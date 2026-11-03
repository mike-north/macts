/**
 * RequiredResource client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { RequiredResource } from '../types.js'

/**
 * Client for a resource required for proper operation of the action.
 */
export class RequiredResourceResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List required resources, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    actionId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: RequiredResource[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: RequiredResource[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        actionId,
      }
    )
  }
}
