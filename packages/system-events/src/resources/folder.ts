/**
 * Folder client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Folder, FolderCreateInput, FolderUpdateInput } from '../types.js'

/**
 * Client for a folder in the file system.
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
    return this.#http.rpc<Folder[]>(`${this.#app}.${this.#resource}.list`)
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

  /**
   * Update an existing folder.
   */
  async update(id: string, input: FolderUpdateInput): Promise<Folder> {
    return this.#http.rpc<Folder>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a folder.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
