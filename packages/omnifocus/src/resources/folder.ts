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

  /**
   * Create a new folder.
   */
  async create(input: FolderCreateInput): Promise<Folder> {
    return this.#http.rpc<Folder>(`${this.#app}.${this.#resource}.createFolder`, input)
  }
}
