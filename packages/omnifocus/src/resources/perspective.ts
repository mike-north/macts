/**
 * Perspective client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

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
   * List all perspectives.
   */
  async list(): Promise<Perspective[]> {
    return this.#http.rpc<Perspective[]>(`${this.#app}.${this.#resource}.listPerspectives`)
  }

  /**
   * Get a perspective by id.
   */
  async get(id: string): Promise<Perspective> {
    return this.#http.rpc<Perspective>(`${this.#app}.${this.#resource}.getPerspective`, { id })
  }
}
