/**
 * BookmarkFolder client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  BookmarkFolder,
  BookmarkFolderCreateInput,
  BookmarkFolderUpdateInput,
} from '../types.js'

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
    return this.#http.rpc<BookmarkFolder[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a bookmarkfolder by id.
   */
  async get(id: string): Promise<BookmarkFolder> {
    return this.#http.rpc<BookmarkFolder>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new bookmarkfolder.
   */
  async create(input: BookmarkFolderCreateInput): Promise<BookmarkFolder> {
    return this.#http.rpc<BookmarkFolder>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing bookmarkfolder.
   */
  async update(id: string, input: BookmarkFolderUpdateInput): Promise<BookmarkFolder> {
    return this.#http.rpc<BookmarkFolder>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a bookmarkfolder.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
