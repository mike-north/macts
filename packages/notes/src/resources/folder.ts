/**
 * Folder client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Folder } from '../types.js'

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
}
