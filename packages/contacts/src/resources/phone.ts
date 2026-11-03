/**
 * Phone client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Phone } from '../types.js'

/**
 * Client for phone number for a person..
 */
export class PhoneResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the phones of one person, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    personId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Phone[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Phone[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        personId,
      }
    )
  }

  /**
   * Get a phone by id within a parent scope.
   */
  async get(personId: string, id: string): Promise<Phone> {
    return this.#http.rpc<Phone>(`${this.#app}.${this.#resource}.get`, { personId, id })
  }
}
