/**
 * Document client for Script Editor SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Document, DocumentCreateInput } from '../types.js'

/**
 * Client for a script editor document.
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
   * List documents, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Document[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Document[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
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
