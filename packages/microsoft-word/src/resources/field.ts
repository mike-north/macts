/**
 * Field client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Field, FieldCreateInput, FieldUpdateInput } from '../types.js'

/**
 * Client for a field in a document.
 */
export class FieldResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all fields.
   */
  async list(): Promise<Field[]> {
    return this.#http.rpc<Field[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a field by id.
   */
  async get(id: string): Promise<Field> {
    return this.#http.rpc<Field>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new field.
   */
  async create(input: FieldCreateInput): Promise<Field> {
    return this.#http.rpc<Field>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing field.
   */
  async update(id: string, input: FieldUpdateInput): Promise<Field> {
    return this.#http.rpc<Field>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a field.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
