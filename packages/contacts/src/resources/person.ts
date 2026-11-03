/**
 * Person client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Person } from '../types.js'

/**
 * Client for a person in the address book database..
 */
export class PersonResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all people.
   */
  async list(): Promise<Person[]> {
    return this.#http.rpc<Person[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a person by id.
   */
  async get(id: string): Promise<Person> {
    return this.#http.rpc<Person>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
