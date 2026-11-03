/**
 * Folder client for Photos SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Folder } from '../types.js'

/**
 * Client for a folder. a container that holds albums and other folders, but not media items.
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
  async list(page: { pageSize?: number; cursor?: string } = {}): Promise<Page<Folder>> {
    return this.#http.rpc<Page<Folder>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
    })
  }

  /**
   * Get a folder by id.
   */
  async get(id: string): Promise<Folder> {
    return this.#http.rpc<Folder>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
