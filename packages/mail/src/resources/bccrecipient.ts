/**
 * BccRecipient client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { BccRecipient, BccRecipientCreateInput, BccRecipientUpdateInput } from '../types.js'

/**
 * Client for an email recipient in the bcc: field.
 */
export class BccRecipientResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all bccrecipients.
   */
  async list(): Promise<BccRecipient[]> {
    return this.#http.rpc<BccRecipient[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a bccrecipient by id.
   */
  async get(id: string): Promise<BccRecipient> {
    return this.#http.rpc<BccRecipient>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new bccrecipient.
   */
  async create(input: BccRecipientCreateInput): Promise<BccRecipient> {
    return this.#http.rpc<BccRecipient>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing bccrecipient.
   */
  async update(id: string, input: BccRecipientUpdateInput): Promise<BccRecipient> {
    return this.#http.rpc<BccRecipient>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a bccrecipient.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
