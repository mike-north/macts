/**
 * DocumentFile client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { DocumentFile, DocumentFileCreateInput, DocumentFileUpdateInput } from '../types.js'

/**
 * Client for a document file.
 */
export class DocumentFileResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all documentfiles.
   */
  async list(): Promise<DocumentFile[]> {
    return this.#http.rpc<DocumentFile[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a documentfile by id.
   */
  async get(id: string): Promise<DocumentFile> {
    return this.#http.rpc<DocumentFile>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new documentfile.
   */
  async create(input: DocumentFileCreateInput): Promise<DocumentFile> {
    return this.#http.rpc<DocumentFile>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing documentfile.
   */
  async update(id: string, input: DocumentFileUpdateInput): Promise<DocumentFile> {
    return this.#http.rpc<DocumentFile>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a documentfile.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
