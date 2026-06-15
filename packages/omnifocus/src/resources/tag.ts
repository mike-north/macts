/**
 * Tag client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Tag, TagCreateInput } from '../types.js'

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
    return this.#http.rpc<Tag[]>(`${this.#app}.${this.#resource}.listTags`)
  }

  /**
   * Get a tag by id.
   */
  async get(id: string): Promise<Tag> {
    return this.#http.rpc<Tag>(`${this.#app}.${this.#resource}.getTag`, { id })
  }

  /**
   * Create a new tag.
   */
  async create(input: TagCreateInput): Promise<Tag> {
    return this.#http.rpc<Tag>(`${this.#app}.${this.#resource}.createTag`, input)
  }
}
