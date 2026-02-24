/**
 * ComboBox client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { ComboBox, ComboBoxCreateInput, ComboBoxUpdateInput } from '../types.js'

/**
 * Client for a combo box belonging to a window.
 */
export class ComboBoxResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all comboboxes.
   */
  async list(): Promise<ComboBox[]> {
    return this.#http.rpc<ComboBox[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a combobox by id.
   */
  async get(id: string): Promise<ComboBox> {
    return this.#http.rpc<ComboBox>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new combobox.
   */
  async create(input: ComboBoxCreateInput): Promise<ComboBox> {
    return this.#http.rpc<ComboBox>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing combobox.
   */
  async update(id: string, input: ComboBoxUpdateInput): Promise<ComboBox> {
    return this.#http.rpc<ComboBox>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a combobox.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
