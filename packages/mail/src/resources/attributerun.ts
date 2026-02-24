/**
 * AttributeRun client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { AttributeRun, AttributeRunCreateInput, AttributeRunUpdateInput } from '../types.js'

/**
 * Client for this subdivides the text into chunks that all have the same attributes..
 */
export class AttributeRunResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all attributeruns.
   */
  async list(): Promise<AttributeRun[]> {
    return this.#http.rpc<AttributeRun[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a attributerun by id.
   */
  async get(id: string): Promise<AttributeRun> {
    return this.#http.rpc<AttributeRun>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new attributerun.
   */
  async create(input: AttributeRunCreateInput): Promise<AttributeRun> {
    return this.#http.rpc<AttributeRun>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing attributerun.
   */
  async update(id: string, input: AttributeRunUpdateInput): Promise<AttributeRun> {
    return this.#http.rpc<AttributeRun>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a attributerun.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
