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
   * List the bookmark items of one bookmark folder, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    folderId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<Page<BookmarkItem>> {
    return this.#http.rpc<Page<BookmarkItem>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      folderId,
    })
  }

  /**
   * Get a bookmark item by id.
   */
  async get(id: string): Promise<BookmarkItem> {
    return this.#http.rpc<BookmarkItem>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
