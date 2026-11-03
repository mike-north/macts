/**
 * Shape client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Shape, ShapeCreateInput } from '../types.js'

/**
 * Client for a shape graphic in omnigraffle.
 */
export class ShapeResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List shapes, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    canvasId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Shape[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Shape[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        canvasId,
      }
    )
  }

  /**
   * Get a shape by id.
   */
  async get(id: string): Promise<Shape> {
    return this.#http.rpc<Shape>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new shape.
   */
  async create(input: ShapeCreateInput): Promise<Shape> {
    return this.#http.rpc<Shape>(`${this.#app}.${this.#resource}.create`, input)
  }
}
