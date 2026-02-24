/**
 * TextRange client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { TextRange, TextRangeCreateInput, TextRangeUpdateInput } from '../types.js'

/**
 * Client for a contiguous area in a document.
 */
export class TextRangeResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all textranges.
   */
  async list(): Promise<TextRange[]> {
    return this.#http.rpc<TextRange[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a textrange by id.
   */
  async get(id: string): Promise<TextRange> {
    return this.#http.rpc<TextRange>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new textrange.
   */
  async create(input: TextRangeCreateInput): Promise<TextRange> {
    return this.#http.rpc<TextRange>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing textrange.
   */
  async update(id: string, input: TextRangeUpdateInput): Promise<TextRange> {
    return this.#http.rpc<TextRange>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a textrange.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
