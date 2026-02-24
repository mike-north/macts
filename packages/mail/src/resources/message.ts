/**
 * Message client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Message, MessageCreateInput, MessageUpdateInput } from '../types.js'

/**
 * Client for an email message.
 */
export class MessageResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all messages.
   */
  async list(): Promise<Message[]> {
    return this.#http.rpc<Message[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a message by id.
   */
  async get(id: string): Promise<Message> {
    return this.#http.rpc<Message>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new message.
   */
  async create(input: MessageCreateInput): Promise<Message> {
    return this.#http.rpc<Message>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing message.
   */
  async update(id: string, input: MessageUpdateInput): Promise<Message> {
    return this.#http.rpc<Message>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a message.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }

  /**
   * Does nothing at all (deprecated)
   */
  async bounce(): Promise<void> {
    await this.#http.rpc<undefined>('mail.messages.bounce', {})
  }

  /**
   * Creates a forwarded message.
   */
  async forward(openingWindow?: boolean): Promise<void> {
    await this.#http.rpc<undefined>('mail.messages.forward', { openingWindow })
  }

  /**
   * Creates a redirected message.
   */
  async redirect(openingWindow?: boolean): Promise<void> {
    await this.#http.rpc<undefined>('mail.messages.redirect', { openingWindow })
  }

  /**
   * Creates a reply message.
   */
  async reply(openingWindow?: boolean, replyToAll?: boolean): Promise<void> {
    await this.#http.rpc<undefined>('mail.messages.reply', { openingWindow, replyToAll })
  }
}
