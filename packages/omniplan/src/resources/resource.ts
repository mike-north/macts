/**
 * Resource client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Resource, ResourceCreateInput } from '../types.js'

/**
 * Client for a resource (person, equipment, or material).
 */
export class ResourceResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List resources, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Resource[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Resource[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a resource by id.
   */
  async get(id: string): Promise<Resource> {
    return this.#http.rpc<Resource>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new resource.
   */
  async create(input: ResourceCreateInput): Promise<Resource> {
    return this.#http.rpc<Resource>(`${this.#app}.${this.#resource}.create`, input)
  }
}
