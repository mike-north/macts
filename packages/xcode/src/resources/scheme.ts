/**
 * Scheme client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Scheme } from '../types.js'

/**
 * Client for a set of parameters for building, testing, launching or distributing the products of a workspace.
 */
export class SchemeResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all schemes.
   */
  async list(workspaceName: string): Promise<Scheme[]> {
    return this.#http.rpc<Scheme[]>(`${this.#app}.${this.#resource}.listSchemes`, { workspaceName })
  }

  /**
   * Get a scheme by id.
   */
  async get(id: string): Promise<Scheme> {
    return this.#http.rpc<Scheme>(`${this.#app}.${this.#resource}.getScheme`, { id })
  }
}
