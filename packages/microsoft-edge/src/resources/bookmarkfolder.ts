/**
 * BookmarkFolder client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { BookmarkFolder } from '../types.js'

/**
 * Client for a bookmarks folder that contains other bookmarks folder and bookmark items..
 */
export class BookmarkFolderResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all bookmark folders, as one page.
   */
  async list(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<BookmarkFolder>> {
    return this.#http.invoke<Page<BookmarkFolder>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'BookmarkFolder'
    )
  }

  /**
   * Get a bookmark folder by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<BookmarkFolder> {
    return this.#http.invoke<BookmarkFolder>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'BookmarkFolder'
    )
  }
}
