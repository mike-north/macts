/**
 * FileDocument client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { FileDocument, FileDocumentCreateInput, FileDocumentUpdateInput } from '../types.js'

/**
 * Client for a document that represents a file on disk.
 */
export class FileDocumentResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all filedocuments.
   */
  async list(): Promise<FileDocument[]> {
    return this.#http.rpc<FileDocument[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a filedocument by name.
   */
  async get(name: string): Promise<FileDocument> {
    return this.#http.rpc<FileDocument>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Create a new filedocument.
   */
  async create(input: FileDocumentCreateInput): Promise<FileDocument> {
    return this.#http.rpc<FileDocument>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing filedocument.
   */
  async update(name: string, input: FileDocumentUpdateInput): Promise<FileDocument> {
    return this.#http.rpc<FileDocument>(`${this.#app}.${this.#resource}.update`, { name, ...input })
  }

  /**
   * Delete a filedocument.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name })
  }
}
