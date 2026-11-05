/**
 * Window client for iTerm SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Window } from '../types.js'

/**
 * Client for a window..
 */
export class WindowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all windows, as one page.
   */
  async list(): Promise<Page<Window>> {
    return this.#http.rpc<Page<Window>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a window by id.
   */
  async get(id: string): Promise<Window> {
    return this.#http.rpc<Window>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
