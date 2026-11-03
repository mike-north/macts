/**
 * Tag client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all tags, as one page.
   */
  async list(): Promise<Page<Tag>> {
    return this.#http.rpc<Page<Tag>>(`${this.#app}.${this.#resource}.list`)
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
}
