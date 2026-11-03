/**
 * Canvas client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Canvas, CanvasCreateInput } from '../types.js'

/**
 * Client for a drawing page/canvas in omnigraffle.
 */
export class CanvasResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List canvases, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Canvas[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Canvas[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a canvas by id.
   */
  async get(id: string): Promise<Canvas> {
    return this.#http.rpc<Canvas>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new canvas.
   */
  async create(input: CanvasCreateInput): Promise<Canvas> {
    return this.#http.rpc<Canvas>(`${this.#app}.${this.#resource}.create`, input)
  }
}
