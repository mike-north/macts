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
   * List all reminders.
   */
  async list(listId: string): Promise<Reminder[]> {
    return this.#http.rpc<Reminder[]>(`${this.#app}.${this.#resource}.listReminders`, { listId })
  }

  /**
   * Get a reminder by id.
   */
  async get(id: string): Promise<Reminder> {
    return this.#http.rpc<Reminder>(`${this.#app}.${this.#resource}.getReminder`, { id })
  }

  /**
   * Create a new reminder.
   */
  async create(input: ReminderCreateInput): Promise<Reminder> {
    return this.#http.rpc<Reminder>(`${this.#app}.${this.#resource}.createReminder`, input)
  }

  /**
   * Delete a reminder.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.deleteReminder`, { id })
  }

  /**
   * Mark a reminder as complete
   */
  async complete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.completeReminder`, { id })
  }

  /**
   * Show the reminder in Reminders.app UI
   */
  async show(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.show`, {})
  }
}
