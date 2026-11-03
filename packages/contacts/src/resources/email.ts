/**
 * Email client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Email } from '../types.js'

/**
 * Client for email address for a person..
 */
export class EmailResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the emails of one person, as one page.
   */
  async list(personId: string): Promise<{ items: Email[] }> {
    return this.#http.rpc<{ items: Email[] }>(`${this.#app}.${this.#resource}.list`, { personId })
  }

  /**
   * Get a email by id within a parent scope.
   */
  async get(personId: string, id: string): Promise<Email> {
    return this.#http.rpc<Email>(`${this.#app}.${this.#resource}.get`, { personId, id })
  }
}
