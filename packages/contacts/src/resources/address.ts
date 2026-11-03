/**
 * Address client for Contacts SDK.
 * Auto-generated - do not edit.
 */

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
   * List all addresses.
   */
  async list(personId: string): Promise<Address[]> {
    return this.#http.rpc<Address[]>(`${this.#app}.${this.#resource}.list`, { personId })
  }

  /**
   * Get a address by id within a parent scope.
   */
  async get(personId: string, id: string): Promise<Address> {
    return this.#http.rpc<Address>(`${this.#app}.${this.#resource}.get`, { personId, id })
  }
}
