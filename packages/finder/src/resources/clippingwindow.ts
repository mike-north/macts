/**
 * ClippingWindow client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  ClippingWindow,
  ClippingWindowCreateInput,
  ClippingWindowUpdateInput,
} from '../types.js'

/**
 * Client for the window containing a clipping.
 */
export class ClippingWindowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all clippingwindows.
   */
  async list(): Promise<ClippingWindow[]> {
    return this.#http.rpc<ClippingWindow[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a clippingwindow by id.
   */
  async get(id: string): Promise<ClippingWindow> {
    return this.#http.rpc<ClippingWindow>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new clippingwindow.
   */
  async create(input: ClippingWindowCreateInput): Promise<ClippingWindow> {
    return this.#http.rpc<ClippingWindow>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing clippingwindow.
   */
  async update(id: string, input: ClippingWindowUpdateInput): Promise<ClippingWindow> {
    return this.#http.rpc<ClippingWindow>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a clippingwindow.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
