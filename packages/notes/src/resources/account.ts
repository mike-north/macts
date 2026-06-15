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
   * List all accounts.
   */
  async list(): Promise<Account[]> {
    return this.#http.rpc<Account[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a account by name.
   */
  async get(name: string): Promise<Account> {
    return this.#http.rpc<Account>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
