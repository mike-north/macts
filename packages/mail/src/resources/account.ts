/**
 * Account client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Account, AccountCreateInput, AccountUpdateInput } from '../types.js'

/**
 * Client for a mail account for receiving messages (pop/imap). to create a new receiving account, use the 'pop account', 'imap account', and 'icloud account' objects.
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
   * Get a account by id.
   */
  async get(id: string): Promise<Account> {
    return this.#http.rpc<Account>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new account.
   */
  async create(input: AccountCreateInput): Promise<Account> {
    return this.#http.rpc<Account>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing account.
   */
  async update(id: string, input: AccountUpdateInput): Promise<Account> {
    return this.#http.rpc<Account>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a account.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
