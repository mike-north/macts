/**
 * OutgoingMessage client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  OutgoingMessage,
  OutgoingMessageCreateInput,
  OutgoingMessageUpdateInput,
} from '../types.js'

/**
 * Client for a new email message.
 */
export class OutgoingMessageResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all outgoingmessages.
   */
  async list(): Promise<OutgoingMessage[]> {
    return this.#http.rpc<OutgoingMessage[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a outgoingmessage by id.
   */
  async get(id: string): Promise<OutgoingMessage> {
    return this.#http.rpc<OutgoingMessage>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new outgoingmessage.
   */
  async create(input: OutgoingMessageCreateInput): Promise<OutgoingMessage> {
    return this.#http.rpc<OutgoingMessage>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing outgoingmessage.
   */
  async update(id: string, input: OutgoingMessageUpdateInput): Promise<OutgoingMessage> {
    return this.#http.rpc<OutgoingMessage>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a outgoingmessage.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }

  /**
   * Sends a message.
   */
  async send(): Promise<void> {
    await this.#http.rpc<undefined>('mail.outgoingmessages.send', {})
  }
}
