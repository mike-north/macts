/**
 * Reminder client for Reminders SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Reminder, ReminderCreateInput, ReminderUpdateInput } from '../types.js'

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
  async list(): Promise<Reminder[]> {
    return this.#http.rpc<Reminder[]>(`${this.#app}.${this.#resource}.list`)
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
   * Update an existing reminder.
   */
  async update(id: string, input: ReminderUpdateInput): Promise<Reminder> {
    return this.#http.rpc<Reminder>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a reminder.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }

  /**
   * Mark a reminder as complete
   */
  async complete(id: string): Promise<void> {
    await this.#http.rpc<undefined>('reminders.reminders.complete', { id })
  }

  /**
   * Show the reminder in Reminders.app UI
   */
  async show(): Promise<void> {
    await this.#http.rpc<undefined>('reminders.reminders.show', {})
  }
}
