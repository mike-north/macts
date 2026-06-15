/**
 * Layer client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Layer, LayerCreateInput } from '../types.js'

/**
 * Client for a drawing layer in omnigraffle.
 */
export class LayerResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all layers.
   */
  async list(): Promise<Layer[]> {
    return this.#http.rpc<Layer[]>(`${this.#app}.${this.#resource}.listLayers`)
  }

  /**
   * Get a layer by name.
   */
  async get(name: string): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.getLayer`, { name })
  }

  /**
   * Create a new layer.
   */
  async create(input: LayerCreateInput): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.createLayer`, input)
  }
}
