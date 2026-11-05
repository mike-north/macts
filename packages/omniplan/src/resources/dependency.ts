/**
 * Dependency client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Dependency } from '../types.js'

/**
 * Client for a dependency of one task upon another task.
 */
export class DependencyResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all dependencies, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Dependency>> {
    return this.#http.invoke<Page<Dependency>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions
    )
  }
}
