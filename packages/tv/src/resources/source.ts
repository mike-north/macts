/**
 * Source client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Source } from '../types.js'

/**
 * Client for a media source (library, cd, device, etc.).
 */
export class SourceResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all sources, as one page.
   */
  async list(): Promise<Page<Source>> {
    return this.#http.rpc<Page<Source>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a source by persistentID.
   */
  async get(persistentID: string): Promise<Source> {
    return this.#http.rpc<Source>(`${this.#app}.${this.#resource}.get`, { persistentID })
  }
}
