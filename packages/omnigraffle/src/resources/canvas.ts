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
   * List all canvases.
   */
  async list(): Promise<Canvas[]> {
    return this.#http.rpc<Canvas[]>(`${this.#app}.${this.#resource}.listCanvases`)
  }

  /**
   * Get a canvas by id.
   */
  async get(id: string): Promise<Canvas> {
    return this.#http.rpc<Canvas>(`${this.#app}.${this.#resource}.getCanvas`, { id })
  }

  /**
   * Create a new canvas.
   */
  async create(input: CanvasCreateInput): Promise<Canvas> {
    return this.#http.rpc<Canvas>(`${this.#app}.${this.#resource}.createCanvas`, input)
  }
}
