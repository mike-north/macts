/**
 * Account client for Reminders SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Account } from '../types.js'

/**
 * Client for an account in the reminders application.
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
    return this.#http.rpc<Account[]>(`${this.#app}.${this.#resource}.listAccounts`)
  }
}
