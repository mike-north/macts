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
  async list(
    canvasId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Layer>> {
    return this.#http.invoke<Page<Layer>>(
      `${this.#app}.${this.#resource}.list`,
      { canvasId },
      __mactsOptions
    )
  }

  /**
   * Get a layer by name.
   * When several layers share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(name: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Layer> {
    return this.#http.invoke<Layer>(`${this.#app}.${this.#resource}.get`, { name }, __mactsOptions)
  }

  /**
   * Create a new layer.
   */
  async create(
    input: LayerCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Layer> {
    return this.#http.invoke<Layer>(`${this.#app}.${this.#resource}.create`, input, __mactsOptions)
  }
}
