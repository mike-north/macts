/**
 * Event client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Event, EventCreateInput, EventUpdateInput } from '../types.js'

/**
 * Client for a calendar event.
 */
export class EventResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List events, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    calendarId: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Event[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Event[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        calendarId,
      }
    )
  }

  /**
   * Get a event by id within a parent scope.
   */
  async get(calendarId: string, id: string): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.get`, { calendarId, id })
  }

  /**
   * Create a new event.
   */
  async create(input: EventCreateInput): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing event within a parent scope.
   */
  async update(calendarId: string, id: string, input: EventUpdateInput): Promise<Event> {
    const { calendarId: _p, ...updateFields } = input as EventUpdateInput & { calendarId?: string }
    void _p
    const defined = Object.fromEntries(
      Object.entries(updateFields as Record<string, unknown>).filter(([, v]) => v !== undefined)
    )
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.update`, {
      calendarId,
      id,
      ...defined,
    })
  }

  /**
   * Delete an event within a parent scope.
   */
  async delete(calendarId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { calendarId, id })
  }

  /**
   * Show the event or to-do in the calendar window
   */
  async show(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.show`, {})
  }
}
