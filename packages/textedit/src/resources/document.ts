/**
 * Document client for TextEdit SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all documents, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Document>> {
    return this.#http.invoke<Page<Document>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Get a document by name.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Document> {
    return this.#http.invoke<Document>(
      `${this.#app}.${this.#resource}.get`,
      { name },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Create a new document.
   */
  async create(
    input: DocumentCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Document> {
    return this.#http.invoke<Document>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Document'
    )
  }
}
