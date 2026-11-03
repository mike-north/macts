/**
 * List client for Reminders SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { List, ListCreateInput } from '../types.js'

/**
 * Client for a list of reminders.
 */
export class ListResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List lists, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: List[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: List[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a list by id.
   */
  async get(id: string): Promise<List> {
    return this.#http.rpc<List>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new list.
   */
  async create(input: ListCreateInput): Promise<List> {
    return this.#http.rpc<List>(`${this.#app}.${this.#resource}.create`, input)
  }
}
