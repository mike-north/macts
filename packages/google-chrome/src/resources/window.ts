/**
 * Window client for Google Chrome SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Window, WindowCreateInput, WindowUpdateInput } from '../types.js'

/**
 * Client for a window..
 */
export class WindowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all windows.
   */
  async list(): Promise<Window[]> {
    return this.#http.rpc<Window[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a window by id.
   */
  async get(id: string): Promise<Window> {
    return this.#http.rpc<Window>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new window.
   */
  async create(input: WindowCreateInput): Promise<Window> {
    return this.#http.rpc<Window>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing window.
   */
  async update(id: string, input: WindowUpdateInput): Promise<Window> {
    return this.#http.rpc<Window>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a window.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
