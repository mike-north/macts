/**
 * Tag client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Tag, TagCreateInput, TagUpdateInput } from '../types.js'

/**
 * Client for a tag for organizing and filtering tasks.
 */
export class TagResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all tags.
   */
  async list(): Promise<Tag[]> {
    return this.#http.rpc<Tag[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a tag by id.
   */
  async get(id: string): Promise<Tag> {
    return this.#http.rpc<Tag>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new tag.
   */
  async create(input: TagCreateInput): Promise<Tag> {
    return this.#http.rpc<Tag>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing tag.
   */
  async update(id: string, input: TagUpdateInput): Promise<Tag> {
    return this.#http.rpc<Tag>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a tag.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
