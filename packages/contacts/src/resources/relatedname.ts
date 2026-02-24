/**
 * RelatedName client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { RelatedName, RelatedNameCreateInput, RelatedNameUpdateInput } from '../types.js'

/**
 * Client for other names related to this person..
 */
export class RelatedNameResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all relatednames.
   */
  async list(): Promise<RelatedName[]> {
    return this.#http.rpc<RelatedName[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a relatedname by id.
   */
  async get(id: string): Promise<RelatedName> {
    return this.#http.rpc<RelatedName>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new relatedname.
   */
  async create(input: RelatedNameCreateInput): Promise<RelatedName> {
    return this.#http.rpc<RelatedName>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing relatedname.
   */
  async update(id: string, input: RelatedNameUpdateInput): Promise<RelatedName> {
    return this.#http.rpc<RelatedName>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a relatedname.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
