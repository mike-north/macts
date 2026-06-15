/**
 * Tab client for Terminal SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Tab } from '../types.js'

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
   * Get a tab by name.
   */
  async get(name: string): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
