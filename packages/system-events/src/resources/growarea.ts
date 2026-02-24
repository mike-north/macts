/**
 * GrowArea client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { GrowArea, GrowAreaCreateInput, GrowAreaUpdateInput } from '../types.js'

/**
 * Client for a grow area belonging to a window.
 */
export class GrowAreaResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all growareas.
   */
  async list(): Promise<GrowArea[]> {
    return this.#http.rpc<GrowArea[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a growarea by id.
   */
  async get(id: string): Promise<GrowArea> {
    return this.#http.rpc<GrowArea>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new growarea.
   */
  async create(input: GrowAreaCreateInput): Promise<GrowArea> {
    return this.#http.rpc<GrowArea>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing growarea.
   */
  async update(id: string, input: GrowAreaUpdateInput): Promise<GrowArea> {
    return this.#http.rpc<GrowArea>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a growarea.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
