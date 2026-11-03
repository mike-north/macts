/**
 * Document client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Document, SaveFormat } from '../types.js'

/**
 * Client for a microsoft word document.
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
   * Get a document by id.
   */
  async get(id: string): Promise<Document> {
    return this.#http.rpc<Document>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Save the specified document
   */
  async save(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.save`, {})
  }

  /**
   * Save the document with a new name or format
   */
  async saveAs(fileName: string, fileFormat?: SaveFormat): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.saveAs`, {
      fileName,
      fileFormat,
    })
  }

  /**
   * Close the specified document
   */
  async close(saving?: boolean): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.close`, { saving })
  }

  /**
   * Print the specified document
   */
  async print(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.print`, {})
  }

  /**
   * Activate the specified document window
   */
  async activate(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.activate`, {})
  }

  /**
   * Create a text range by character positions
   */
  async createRange(start?: number, end?: number): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.createRange`, { start, end })
  }
}
