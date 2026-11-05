/**
 * Account client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all accounts, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Account>> {
    return this.#http.invoke<Page<Account>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions
    )
  }

  /**
   * Get a account by name.
   * When several accounts share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Account> {
    return this.#http.invoke<Account>(
      `${this.#app}.${this.#resource}.get`,
      { name },
      __mactsOptions
    )
  }
}
