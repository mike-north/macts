/**
 * Document client for TextEdit SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Document, DocumentCreateInput } from '../types.js'

/**
 * Client for a textedit document.
 */
export class DocumentResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all documents.
   */
  async list(): Promise<Document[]> {
    return this.#http.rpc<Document[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a document by name.
   */
  async get(name: string): Promise<Document> {
    return this.#http.rpc<Document>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Create a new document.
   */
  async create(input: DocumentCreateInput): Promise<Document> {
    return this.#http.rpc<Document>(`${this.#app}.${this.#resource}.create`, input)
  }
}
