/**
 * Tab client for Terminal SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Tab, TabCreateInput, TabUpdateInput } from '../types.js'

/**
 * Client for a terminal tab.
 */
export class TabResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all tabs.
   */
  async list(): Promise<Tab[]> {
    return this.#http.rpc<Tab[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a tab by tty.
   */
  async get(tty: string): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.get`, { tty })
  }

  /**
   * Create a new tab.
   */
  async create(input: TabCreateInput): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing tab.
   */
  async update(tty: string, input: TabUpdateInput): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.update`, { tty, ...input })
  }

  /**
   * Delete a tab.
   */
  async delete(tty: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { tty })
  }
}
