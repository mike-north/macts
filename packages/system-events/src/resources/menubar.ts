/**
 * MenuBar client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { MenuBar, MenuBarCreateInput, MenuBarUpdateInput } from '../types.js'

/**
 * Client for a menu bar belonging to a process.
 */
export class MenuBarResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all menubars.
   */
  async list(): Promise<MenuBar[]> {
    return this.#http.rpc<MenuBar[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a menubar by id.
   */
  async get(id: string): Promise<MenuBar> {
    return this.#http.rpc<MenuBar>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new menubar.
   */
  async create(input: MenuBarCreateInput): Promise<MenuBar> {
    return this.#http.rpc<MenuBar>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing menubar.
   */
  async update(id: string, input: MenuBarUpdateInput): Promise<MenuBar> {
    return this.#http.rpc<MenuBar>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a menubar.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
