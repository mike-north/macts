/**
 * DiskItem client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { DiskItem, DiskItemCreateInput, DiskItemUpdateInput } from '../types.js'

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
   * List all diskitems.
   */
  async list(): Promise<DiskItem[]> {
    return this.#http.rpc<DiskItem[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a diskitem by id.
   */
  async get(id: string): Promise<DiskItem> {
    return this.#http.rpc<DiskItem>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new diskitem.
   */
  async create(input: DiskItemCreateInput): Promise<DiskItem> {
    return this.#http.rpc<DiskItem>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing diskitem.
   */
  async update(id: string, input: DiskItemUpdateInput): Promise<DiskItem> {
    return this.#http.rpc<DiskItem>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a diskitem.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
