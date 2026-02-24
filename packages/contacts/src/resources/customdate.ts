/**
 * CustomDate client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { CustomDate, CustomDateCreateInput, CustomDateUpdateInput } from '../types.js'

/**
 * Client for arbitrary date associated with this person..
 */
export class CustomDateResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all customdates.
   */
  async list(): Promise<CustomDate[]> {
    return this.#http.rpc<CustomDate[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a customdate by id.
   */
  async get(id: string): Promise<CustomDate> {
    return this.#http.rpc<CustomDate>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new customdate.
   */
  async create(input: CustomDateCreateInput): Promise<CustomDate> {
    return this.#http.rpc<CustomDate>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing customdate.
   */
  async update(id: string, input: CustomDateUpdateInput): Promise<CustomDate> {
    return this.#http.rpc<CustomDate>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a customdate.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
