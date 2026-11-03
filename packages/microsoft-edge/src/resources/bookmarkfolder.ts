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
   * List bookmark folders, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(page: { pageSize?: number; cursor?: string } = {}): Promise<Page<BookmarkFolder>> {
    return this.#http.rpc<Page<BookmarkFolder>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
    })
  }

  /**
   * Get a bookmark folder by id.
   */
  async get(id: string): Promise<BookmarkFolder> {
    return this.#http.rpc<BookmarkFolder>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
