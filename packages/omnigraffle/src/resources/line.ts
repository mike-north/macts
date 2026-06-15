/**
 * Line client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Line } from '../types.js'

/**
 * Client for a line/connector in omnigraffle.
 */
export class LineResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all lines.
   */
  async list(): Promise<Line[]> {
    return this.#http.rpc<Line[]>(`${this.#app}.${this.#resource}.listLines`)
  }

  /**
   * Get a line by id.
   */
  async get(id: string): Promise<Line> {
    return this.#http.rpc<Line>(`${this.#app}.${this.#resource}.getLine`, { id })
  }
}
