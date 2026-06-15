/**
 * Attachment client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Attachment } from '../types.js'

/**
 * Client for a note attachment.
 */
export class AttachmentResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all attachments.
   */
  async list(): Promise<Attachment[]> {
    return this.#http.rpc<Attachment[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a attachment by name.
   */
  async get(name: string): Promise<Attachment> {
    return this.#http.rpc<Attachment>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
