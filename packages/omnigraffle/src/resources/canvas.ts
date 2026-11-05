/**
 * Canvas client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all canvases, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Canvas>> {
    return this.#http.invoke<Page<Canvas>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Canvas'
    )
  }

  /**
   * Get a canvas by id.
   */
  async get(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Canvas> {
    return this.#http.invoke<Canvas>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Canvas'
    )
  }

  /**
   * Create a new canvas.
   */
  async create(
    input: CanvasCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Canvas> {
    return this.#http.invoke<Canvas>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Canvas'
    )
  }
}
