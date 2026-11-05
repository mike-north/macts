/**
 * DiskItem client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { DiskItem } from '../types.js'

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
   * Get a disk item by posixPath.
   */
  async get(posixPath: string): Promise<DiskItem> {
    return this.#http.rpc<DiskItem>(`${this.#app}.${this.#resource}.get`, { posixPath })
  }
}
