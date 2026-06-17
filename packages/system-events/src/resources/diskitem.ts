/**
 * DiskItem client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

/**
 * Client for an item stored in the file system.
 */
export class DiskItemResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * Delete an diskitem.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
