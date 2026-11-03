/**
 * Line client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Line } from '../types.js'

/**
 * Client for a line/connector in omnigraffle.
 */
export class LineResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List lines, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    canvasId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Line[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Line[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        canvasId,
      }
    )
  }

  /**
   * Get a line by id.
   */
  async get(id: string): Promise<Line> {
    return this.#http.rpc<Line>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
