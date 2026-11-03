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
   * List tags, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Tag[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Tag[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
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
