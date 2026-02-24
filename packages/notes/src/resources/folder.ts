/**
 * Folder client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Folder, FolderCreateInput, FolderUpdateInput } from '../types.js'

/**
 * Client for a notes folder.
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
   * Get a folder by name.
   */
  async get(name: string): Promise<Folder> {
    return this.#http.rpc<Folder>(`${this.#app}.${this.#resource}.get`, { name })
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
  async update(name: string, input: FolderUpdateInput): Promise<Folder> {
    return this.#http.rpc<Folder>(`${this.#app}.${this.#resource}.update`, { name, ...input })
  }

  /**
   * Delete a folder.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name })
  }
}
