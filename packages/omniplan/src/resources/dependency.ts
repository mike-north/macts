/**
 * Dependency client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

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
   * List all dependencies.
   */
  async list(): Promise<Dependency[]> {
    return this.#http.rpc<Dependency[]>(`${this.#app}.${this.#resource}.listDependencies`)
  }
}
