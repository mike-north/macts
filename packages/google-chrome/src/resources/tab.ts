/**
 * Tab client for Google Chrome SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Tab } from '../types.js'

/**
 * Client for a tab..
 */
export class TabResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the tabs of one window, as one page.
   */
  async list(
    windowId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Tab>> {
    return this.#http.invoke<Page<Tab>>(
      `${this.#app}.${this.#resource}.list`,
      { windowId },
      __mactsOptions
    )
  }

  /**
   * Get a tab by id within a parent scope.
   */
  async get(
    windowId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Tab> {
    return this.#http.invoke<Tab>(
      `${this.#app}.${this.#resource}.get`,
      { windowId, id },
      __mactsOptions
    )
  }
}
