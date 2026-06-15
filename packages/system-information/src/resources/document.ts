/**
 * Document client for System Information SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Document } from '../types.js'

/**
 * Client for a system profile document.
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
}
