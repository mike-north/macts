/**
 * Address client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Address } from '../types.js'

/**
 * Client for address for the given record..
 */
export class AddressResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the addresses of one person, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    personId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<Page<Address>> {
    return this.#http.rpc<Page<Address>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      personId,
    })
  }

  /**
   * Get a address by id within a parent scope.
   */
  async get(personId: string, id: string): Promise<Address> {
    return this.#http.rpc<Address>(`${this.#app}.${this.#resource}.get`, { personId, id })
  }
}
