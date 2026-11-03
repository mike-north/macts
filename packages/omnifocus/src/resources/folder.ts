/**
 * Folder client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Folder, FolderCreateInput } from '../types.js'

/**
 * Client for a group of projects and sub-folders representing an area of responsibility.
 */
export class FolderResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List folders, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Folder[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Folder[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a folder by id.
   */
  async get(id: string): Promise<Folder> {
    return this.#http.rpc<Folder>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new folder.
   */
  async create(input: FolderCreateInput): Promise<Folder> {
    return this.#http.rpc<Folder>(`${this.#app}.${this.#resource}.create`, input)
  }
}
