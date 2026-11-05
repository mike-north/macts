/**
 * BookmarkItem client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { BookmarkItem } from '../types.js'

/**
 * Client for an item consists of an url and the title of a bookmark.
 */
export class BookmarkItemResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the bookmark items of one bookmark folder, as one page.
   */
  async list(
    folderId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<BookmarkItem>> {
    return this.#http.invoke<Page<BookmarkItem>>(
      `${this.#app}.${this.#resource}.list`,
      { folderId },
      __mactsOptions,
      'BookmarkItem'
    )
  }

  /**
   * Get a bookmark item by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<BookmarkItem> {
    return this.#http.invoke<BookmarkItem>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'BookmarkItem'
    )
  }
}
