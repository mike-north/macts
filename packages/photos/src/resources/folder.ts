/**
 * Folder client for Photos SDK.
 * Auto-generated - do not edit.
 */

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
   * List all folders.
   */
  async list(): Promise<Folder[]> {
    return this.#http.rpc<Folder[]>(`${this.#app}.${this.#resource}.listFolders`)
  }

  /**
   * Get a folder by id.
   */
  async get(id: string): Promise<Folder> {
    return this.#http.rpc<Folder>(`${this.#app}.${this.#resource}.getFolder`, { id })
  }
}
