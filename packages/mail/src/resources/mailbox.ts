/**
 * Mailbox client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Mailbox, MailboxCreateInput, MailboxUpdateInput } from '../types.js'

/**
 * Client for a mailbox that holds messages.
 */
export class MailboxResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all mailboxes.
   */
  async list(): Promise<Mailbox[]> {
    return this.#http.rpc<Mailbox[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a mailbox by id.
   */
  async get(id: string): Promise<Mailbox> {
    return this.#http.rpc<Mailbox>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new mailbox.
   */
  async create(input: MailboxCreateInput): Promise<Mailbox> {
    return this.#http.rpc<Mailbox>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing mailbox.
   */
  async update(id: string, input: MailboxUpdateInput): Promise<Mailbox> {
    return this.#http.rpc<Mailbox>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a mailbox.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
