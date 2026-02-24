/**
 * Chat client for Messages SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Chat, ChatCreateInput, ChatUpdateInput } from '../types.js'

/**
 * Client for an sms or imessage chat..
 */
export class ChatResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all chats.
   */
  async list(): Promise<Chat[]> {
    return this.#http.rpc<Chat[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a chat by id.
   */
  async get(id: string): Promise<Chat> {
    return this.#http.rpc<Chat>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new chat.
   */
  async create(input: ChatCreateInput): Promise<Chat> {
    return this.#http.rpc<Chat>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing chat.
   */
  async update(id: string, input: ChatUpdateInput): Promise<Chat> {
    return this.#http.rpc<Chat>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a chat.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
