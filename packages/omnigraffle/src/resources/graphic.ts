/**
 * Graphic client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List the graphics of one canvas, as one page.
   */
  async list(
    canvasId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Graphic>> {
    return this.#http.invoke<Page<Graphic>>(
      `${this.#app}.${this.#resource}.list`,
      { canvasId },
      __mactsOptions,
      'Graphic'
    )
  }

  /**
   * Get a graphic by id.
   */
  async get(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Graphic> {
    return this.#http.invoke<Graphic>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Graphic'
    )
  }
}
