/**
 * Window client for Terminal SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Window } from '../types.js'

/**
 * Client for a terminal window.
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
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Window>> {
    return this.#http.invoke<Page<Window>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions
    )
  }

  /**
   * Get a window by name.
   * When several windows share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Window> {
    return this.#http.invoke<Window>(`${this.#app}.${this.#resource}.get`, { name }, __mactsOptions)
  }
}
