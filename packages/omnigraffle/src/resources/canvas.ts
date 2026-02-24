/**
 * Canvas client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Canvas, CanvasCreateInput, CanvasUpdateInput } from '../types.js'

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
    return this.#http.rpc<Canvas[]>(`${this.#app}.${this.#resource}.list`)
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

  /**
   * Update an existing canvas.
   */
  async update(id: string, input: CanvasUpdateInput): Promise<Canvas> {
    return this.#http.rpc<Canvas>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a canvas.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
