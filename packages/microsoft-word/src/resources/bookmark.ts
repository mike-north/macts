/**
 * Bookmark client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Bookmark, BookmarkCreateInput, BookmarkUpdateInput } from '../types.js'

/**
 * Client for a bookmark in a document.
 */
export class BookmarkResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all bookmarks.
   */
  async list(): Promise<Bookmark[]> {
    return this.#http.rpc<Bookmark[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a bookmark by id.
   */
  async get(id: string): Promise<Bookmark> {
    return this.#http.rpc<Bookmark>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new bookmark.
   */
  async create(input: BookmarkCreateInput): Promise<Bookmark> {
    return this.#http.rpc<Bookmark>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing bookmark.
   */
  async update(id: string, input: BookmarkUpdateInput): Promise<Bookmark> {
    return this.#http.rpc<Bookmark>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a bookmark.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
