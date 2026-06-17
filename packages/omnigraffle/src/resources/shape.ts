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
   * List all shapes.
   */
  async list(canvasId: string): Promise<Shape[]> {
    return this.#http.rpc<Shape[]>(`${this.#app}.${this.#resource}.listShapes`, { canvasId })
  }

  /**
   * Get a shape by id.
   */
  async get(id: string): Promise<Shape> {
    return this.#http.rpc<Shape>(`${this.#app}.${this.#resource}.getShape`, { id })
  }

  /**
   * Create a new shape.
   */
  async create(input: ShapeCreateInput): Promise<Shape> {
    return this.#http.rpc<Shape>(`${this.#app}.${this.#resource}.createShape`, input)
  }
}
