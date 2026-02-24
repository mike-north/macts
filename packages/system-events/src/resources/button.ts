/**
 * Button client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Button, ButtonCreateInput, ButtonUpdateInput } from '../types.js'

/**
 * Client for a button belonging to a window or scroll bar.
 */
export class ButtonResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all buttons.
   */
  async list(): Promise<Button[]> {
    return this.#http.rpc<Button[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a button by id.
   */
  async get(id: string): Promise<Button> {
    return this.#http.rpc<Button>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new button.
   */
  async create(input: ButtonCreateInput): Promise<Button> {
    return this.#http.rpc<Button>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing button.
   */
  async update(id: string, input: ButtonUpdateInput): Promise<Button> {
    return this.#http.rpc<Button>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a button.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
