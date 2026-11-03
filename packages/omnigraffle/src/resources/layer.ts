/**
 * Layer client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List the layers of one canvas, as one page.
   */
  async list(canvasId: string): Promise<Page<Layer>> {
    return this.#http.rpc<Page<Layer>>(`${this.#app}.${this.#resource}.list`, { canvasId })
  }

  /**
   * Get a layer by name.
   */
  async get(name: string): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Create a new layer.
   */
  async create(input: LayerCreateInput): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.create`, input)
  }
}
