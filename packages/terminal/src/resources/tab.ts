/**
 * Tab client for Terminal SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Tab } from '../types.js'

/**
 * Client for a terminal tab.
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
   * List all tabs, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Tab>> {
    return this.#http.invoke<Page<Tab>>(`${this.#app}.${this.#resource}.list`, {}, __mactsOptions)
  }

  /**
   * Get a tab by name.
   * When several tabs share the same tty, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(name: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Tab> {
    return this.#http.invoke<Tab>(`${this.#app}.${this.#resource}.get`, { name }, __mactsOptions)
  }
}
