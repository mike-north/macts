/**
 * Account client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Account } from '../types.js'

/**
 * Client for a notes account.
 */
export class AccountResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List accounts, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Account[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Account[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a account by name.
   */
  async get(name: string): Promise<Account> {
    return this.#http.rpc<Account>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
