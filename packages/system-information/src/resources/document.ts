/**
 * Document client for System Information SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all documents, as one page.
   */
  async list(): Promise<Page<Document>> {
    return this.#http.rpc<Page<Document>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a document by name.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(name: string): Promise<Document> {
    return this.#http.rpc<Document>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
