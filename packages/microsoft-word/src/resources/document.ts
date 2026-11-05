/**
 * Document client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all documents, as one page.
   */
  async list(): Promise<Page<Document>> {
    return this.#http.rpc<Page<Document>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a document by id.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(id: string): Promise<Document> {
    return this.#http.rpc<Document>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Save the specified document
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async save(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.save`, { id })
  }

  /**
   * Save the document with a new name or format
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async saveAs(id: string, fileName: string, fileFormat?: SaveFormat): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.saveAs`, {
      id,
      fileName,
      fileFormat,
    })
  }

  /**
   * Close the specified document
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async close(id: string, saving?: boolean): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.close`, { id, saving })
  }

  /**
   * Print the specified document
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async print(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.print`, { id })
  }

  /**
   * Activate the specified document window
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async activate(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.activate`, { id })
  }

  /**
   * Create a text range by character positions
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async createRange(id: string, start?: number, end?: number): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.createRange`, {
      id,
      start,
      end,
    })
  }
}
