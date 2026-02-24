/**
 * Column client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Column, ColumnCreateInput, ColumnUpdateInput } from '../types.js'

/**
 * Client for a column in a table.
 */
export class ColumnResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all columns.
   */
  async list(): Promise<Column[]> {
    return this.#http.rpc<Column[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a column by id.
   */
  async get(id: string): Promise<Column> {
    return this.#http.rpc<Column>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new column.
   */
  async create(input: ColumnCreateInput): Promise<Column> {
    return this.#http.rpc<Column>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing column.
   */
  async update(id: string, input: ColumnUpdateInput): Promise<Column> {
    return this.#http.rpc<Column>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a column.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
