/**
 * Shape client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Shape, ShapeCreateInput, ShapeUpdateInput } from '../types.js'

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
  async list(): Promise<Shape[]> {
    return this.#http.rpc<Shape[]>(`${this.#app}.${this.#resource}.list`)
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

  /**
   * Update an existing shape.
   */
  async update(id: string, input: ShapeUpdateInput): Promise<Shape> {
    return this.#http.rpc<Shape>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a shape.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
