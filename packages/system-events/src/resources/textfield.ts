/**
 * TextField client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { TextField, TextFieldCreateInput, TextFieldUpdateInput } from '../types.js'

/**
 * Client for a text field belonging to a window.
 */
export class TextFieldResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all textfields.
   */
  async list(): Promise<TextField[]> {
    return this.#http.rpc<TextField[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a textfield by id.
   */
  async get(id: string): Promise<TextField> {
    return this.#http.rpc<TextField>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new textfield.
   */
  async create(input: TextFieldCreateInput): Promise<TextField> {
    return this.#http.rpc<TextField>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing textfield.
   */
  async update(id: string, input: TextFieldUpdateInput): Promise<TextField> {
    return this.#http.rpc<TextField>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a textfield.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
