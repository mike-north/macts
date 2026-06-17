/**
 * BookmarkItem client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

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
   * List all bookmarkitems.
   */
  async list(folderId: string): Promise<BookmarkItem[]> {
    return this.#http.rpc<BookmarkItem[]>(`${this.#app}.${this.#resource}.listBookmarkItems`, {
      folderId,
    })
  }

  /**
   * Get a bookmarkitem by id.
   */
  async get(id: string): Promise<BookmarkItem> {
    return this.#http.rpc<BookmarkItem>(`${this.#app}.${this.#resource}.getBookmarkItem`, { id })
  }
}
