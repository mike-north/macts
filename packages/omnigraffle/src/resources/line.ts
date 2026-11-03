/**
 * Line client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List the lines of one canvas, as one page.
   */
  async list(canvasId: string): Promise<Page<Line>> {
    return this.#http.rpc<Page<Line>>(`${this.#app}.${this.#resource}.list`, { canvasId })
  }

  /**
   * Get a line by id.
   */
  async get(id: string): Promise<Line> {
    return this.#http.rpc<Line>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
