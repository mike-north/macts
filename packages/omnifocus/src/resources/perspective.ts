/**
 * Perspective client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Perspective } from '../types.js'

/**
 * Client for a saved view or filter configuration.
 */
export class PerspectiveResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all perspectives, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Perspective>> {
    return this.#http.invoke<Page<Perspective>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions
    )
  }

  /**
   * Get a perspective by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Perspective> {
    return this.#http.invoke<Perspective>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions
    )
  }
}
