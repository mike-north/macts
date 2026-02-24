/**
 * Drawer client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Drawer, DrawerCreateInput, DrawerUpdateInput } from '../types.js'

/**
 * Client for a drawer that may be extended from a window.
 */
export class DrawerResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all drawers.
   */
  async list(): Promise<Drawer[]> {
    return this.#http.rpc<Drawer[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a drawer by id.
   */
  async get(id: string): Promise<Drawer> {
    return this.#http.rpc<Drawer>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new drawer.
   */
  async create(input: DrawerCreateInput): Promise<Drawer> {
    return this.#http.rpc<Drawer>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing drawer.
   */
  async update(id: string, input: DrawerUpdateInput): Promise<Drawer> {
    return this.#http.rpc<Drawer>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a drawer.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
