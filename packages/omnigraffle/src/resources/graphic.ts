/**
 * Graphic client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Graphic } from '../types.js'

/**
 * Client for base class for visual elements in omnigraffle.
 */
export class GraphicResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List graphics, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    canvasId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Graphic[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Graphic[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        canvasId,
      }
    )
  }

  /**
   * Get a graphic by id.
   */
  async get(id: string): Promise<Graphic> {
    return this.#http.rpc<Graphic>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
