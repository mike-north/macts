/**
 * Reminder client for Reminders SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Reminder, ReminderCreateInput } from '../types.js'

/**
 * Client for a reminder item.
 */
export class ReminderResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the reminders of one list, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    listId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Reminder[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Reminder[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        listId,
      }
    )
  }

  /**
   * Get a reminder by id.
   */
  async get(id: string): Promise<Reminder> {
    return this.#http.rpc<Reminder>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new reminder.
   */
  async create(input: ReminderCreateInput): Promise<Reminder> {
    return this.#http.rpc<Reminder>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Delete an reminder.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }

  /**
   * Mark a reminder as complete
   */
  async complete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.complete`, { id })
  }

  /**
   * Show the reminder in Reminders.app UI
   */
  async show(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.show`, {})
  }
}
