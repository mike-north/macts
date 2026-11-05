/**
 * Shape client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List the shapes of one canvas, as one page.
   */
  async list(
    canvasId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Shape>> {
    return this.#http.invoke<Page<Shape>>(
      `${this.#app}.${this.#resource}.list`,
      { canvasId },
      __mactsOptions,
      'Shape'
    )
  }

  /**
   * Get a shape by id.
   */
  async get(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Shape> {
    return this.#http.invoke<Shape>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Shape'
    )
  }

  /**
   * Create a new shape.
   */
  async create(
    input: ShapeCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Shape> {
    return this.#http.invoke<Shape>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Shape'
    )
  }
}
