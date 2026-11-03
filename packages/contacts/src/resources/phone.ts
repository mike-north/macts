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
   * List the phones of one person.
   */
  async list(personId: string): Promise<Phone[]> {
    return this.#http.rpc<Phone[]>(`${this.#app}.${this.#resource}.list`, { personId })
  }

  /**
   * Get a phone by id within a parent scope.
   */
  async get(personId: string, id: string): Promise<Phone> {
    return this.#http.rpc<Phone>(`${this.#app}.${this.#resource}.get`, { personId, id })
  }
}
