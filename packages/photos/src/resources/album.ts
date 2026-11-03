/**
 * Album client for Photos SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Album } from '../types.js'

/**
 * Client for an album. a container that holds media items.
 */
export class AlbumResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List albums, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(page: { pageSize?: number; cursor?: string } = {}): Promise<Page<Album>> {
    return this.#http.rpc<Page<Album>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
    })
  }

  /**
   * Get a album by id.
   */
  async get(id: string): Promise<Album> {
    return this.#http.rpc<Album>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
