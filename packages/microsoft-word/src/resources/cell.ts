/**
 * Cell client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Cell, CellCreateInput, CellUpdateInput } from '../types.js'

/**
 * Client for a cell in a table.
 */
export class CellResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all cells.
   */
  async list(): Promise<Cell[]> {
    return this.#http.rpc<Cell[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a cell by id.
   */
  async get(id: string): Promise<Cell> {
    return this.#http.rpc<Cell>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new cell.
   */
  async create(input: CellCreateInput): Promise<Cell> {
    return this.#http.rpc<Cell>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing cell.
   */
  async update(id: string, input: CellUpdateInput): Promise<Cell> {
    return this.#http.rpc<Cell>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a cell.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
