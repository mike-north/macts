/**
 * Window client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Window, WindowCreateInput } from '../types.js'

/**
 * Client for a window..
 */
export class WindowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List windows, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Window[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Window[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a window by id.
   */
  async get(id: string): Promise<Window> {
    return this.#http.rpc<Window>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new window.
   */
  async create(input: WindowCreateInput): Promise<Window> {
    return this.#http.rpc<Window>(`${this.#app}.${this.#resource}.create`, input)
  }
}
