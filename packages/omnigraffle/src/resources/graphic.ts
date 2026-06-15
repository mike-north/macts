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
   * List all graphics.
   */
  async list(): Promise<Graphic[]> {
    return this.#http.rpc<Graphic[]>(`${this.#app}.${this.#resource}.listGraphics`)
  }

  /**
   * Get a graphic by id.
   */
  async get(id: string): Promise<Graphic> {
    return this.#http.rpc<Graphic>(`${this.#app}.${this.#resource}.getGraphic`, { id })
  }
}
