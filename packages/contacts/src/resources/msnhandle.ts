/**
 * MSNHandle client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { MSNHandle, MSNHandleCreateInput, MSNHandleUpdateInput } from '../types.js'

/**
 * Client for user name for microsoft network (msn) instant messaging..
 */
export class MSNHandleResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all msnhandles.
   */
  async list(): Promise<MSNHandle[]> {
    return this.#http.rpc<MSNHandle[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a msnhandle by id.
   */
  async get(id: string): Promise<MSNHandle> {
    return this.#http.rpc<MSNHandle>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new msnhandle.
   */
  async create(input: MSNHandleCreateInput): Promise<MSNHandle> {
    return this.#http.rpc<MSNHandle>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing msnhandle.
   */
  async update(id: string, input: MSNHandleUpdateInput): Promise<MSNHandle> {
    return this.#http.rpc<MSNHandle>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a msnhandle.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
