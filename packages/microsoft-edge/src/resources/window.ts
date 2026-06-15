/**
 * Window client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Window, WindowCreateInput } from '../types.js'

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
    return this.#http.rpc<Window[]>(`${this.#app}.${this.#resource}.listWindows`)
  }

  /**
   * Get a window by id.
   */
  async get(id: string): Promise<Window> {
    return this.#http.rpc<Window>(`${this.#app}.${this.#resource}.getWindow`, { id })
  }

  /**
   * Create a new window.
   */
  async create(input: WindowCreateInput): Promise<Window> {
    return this.#http.rpc<Window>(`${this.#app}.${this.#resource}.createWindow`, input)
  }
}
