/**
 * Domain client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Domain } from '../types.js'

/**
 * Client for a domain in the file system.
 */
export class DomainResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all domains, as one page.
   */
  async list(): Promise<Page<Domain>> {
    return this.#http.rpc<Page<Domain>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a domain by id.
   */
  async get(id: string): Promise<Domain> {
    return this.#http.rpc<Domain>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
