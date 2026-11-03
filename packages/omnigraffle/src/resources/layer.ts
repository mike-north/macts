/**
 * Layer client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Layer, LayerCreateInput } from '../types.js'

/**
 * Client for a drawing layer in omnigraffle.
 */
export class LayerResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List layers, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    canvasId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Layer[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Layer[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        canvasId,
      }
    )
  }

  /**
   * Get a layer by name.
   */
  async get(name: string): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Create a new layer.
   */
  async create(input: LayerCreateInput): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.create`, input)
  }
}
