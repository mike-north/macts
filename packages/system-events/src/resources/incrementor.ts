/**
 * Incrementor client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Incrementor, IncrementorCreateInput, IncrementorUpdateInput } from '../types.js'

/**
 * Client for a incrementor belonging to a window.
 */
export class IncrementorResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all incrementors.
   */
  async list(): Promise<Incrementor[]> {
    return this.#http.rpc<Incrementor[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a incrementor by id.
   */
  async get(id: string): Promise<Incrementor> {
    return this.#http.rpc<Incrementor>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new incrementor.
   */
  async create(input: IncrementorCreateInput): Promise<Incrementor> {
    return this.#http.rpc<Incrementor>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing incrementor.
   */
  async update(id: string, input: IncrementorUpdateInput): Promise<Incrementor> {
    return this.#http.rpc<Incrementor>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a incrementor.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
