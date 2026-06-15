/**
 * BookmarkFolder client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

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
   * List all bookmarkfolders.
   */
  async list(): Promise<BookmarkFolder[]> {
    return this.#http.rpc<BookmarkFolder[]>(`${this.#app}.${this.#resource}.listBookmarkFolders`)
  }

  /**
   * Get a bookmarkfolder by id.
   */
  async get(id: string): Promise<BookmarkFolder> {
    return this.#http.rpc<BookmarkFolder>(`${this.#app}.${this.#resource}.getBookmarkFolder`, {
      id,
    })
  }
}
