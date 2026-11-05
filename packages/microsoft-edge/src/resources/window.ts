/**
 * Window client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Window, WindowCreateInput } from '../types.js'

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
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Window>> {
    return this.#http.invoke<Page<Window>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Window'
    )
  }

  /**
   * Get a window by id.
   */
  async get(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Window> {
    return this.#http.invoke<Window>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Window'
    )
  }

  /**
   * Create a new window.
   */
  async create(
    input: WindowCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Window> {
    return this.#http.invoke<Window>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Window'
    )
  }
}
