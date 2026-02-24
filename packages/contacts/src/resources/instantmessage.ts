/**
 * InstantMessage client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  InstantMessage,
  InstantMessageCreateInput,
  InstantMessageUpdateInput,
} from '../types.js'

/**
 * Client for address for instant messaging..
 */
export class InstantMessageResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all instantmessages.
   */
  async list(): Promise<InstantMessage[]> {
    return this.#http.rpc<InstantMessage[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a instantmessage by id.
   */
  async get(id: string): Promise<InstantMessage> {
    return this.#http.rpc<InstantMessage>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new instantmessage.
   */
  async create(input: InstantMessageCreateInput): Promise<InstantMessage> {
    return this.#http.rpc<InstantMessage>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing instantmessage.
   */
  async update(id: string, input: InstantMessageUpdateInput): Promise<InstantMessage> {
    return this.#http.rpc<InstantMessage>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a instantmessage.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
