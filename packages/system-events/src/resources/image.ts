/**
 * Image client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Image, ImageCreateInput, ImageUpdateInput } from '../types.js'

/**
 * Client for an image belonging to a static text field.
 */
export class ImageResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all images.
   */
  async list(): Promise<Image[]> {
    return this.#http.rpc<Image[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a image by id.
   */
  async get(id: string): Promise<Image> {
    return this.#http.rpc<Image>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new image.
   */
  async create(input: ImageCreateInput): Promise<Image> {
    return this.#http.rpc<Image>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing image.
   */
  async update(id: string, input: ImageUpdateInput): Promise<Image> {
    return this.#http.rpc<Image>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a image.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
