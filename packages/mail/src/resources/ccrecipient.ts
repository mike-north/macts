/**
 * CcRecipient client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { CcRecipient, CcRecipientCreateInput, CcRecipientUpdateInput } from '../types.js'

/**
 * Client for an email recipient in the cc: field.
 */
export class CcRecipientResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all ccrecipients.
   */
  async list(): Promise<CcRecipient[]> {
    return this.#http.rpc<CcRecipient[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a ccrecipient by id.
   */
  async get(id: string): Promise<CcRecipient> {
    return this.#http.rpc<CcRecipient>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new ccrecipient.
   */
  async create(input: CcRecipientCreateInput): Promise<CcRecipient> {
    return this.#http.rpc<CcRecipient>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing ccrecipient.
   */
  async update(id: string, input: CcRecipientUpdateInput): Promise<CcRecipient> {
    return this.#http.rpc<CcRecipient>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a ccrecipient.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
