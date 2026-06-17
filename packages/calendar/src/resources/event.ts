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
   * List all events.
   */
  async list(calendarId: string): Promise<Event[]> {
    return this.#http.rpc<Event[]>(`${this.#app}.${this.#resource}.listEvents`, { calendarId })
  }

  /**
   * Get a event by id within a parent scope.
   */
  async get(calendarId: string, id: string): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.getEvent`, { calendarId, id })
  }

  /**
   * Create a new event.
   */
  async create(input: EventCreateInput): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.createEvent`, input)
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
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.updateEvent`, {
      calendarId,
      id,
      ...defined,
    })
  }

  /**
   * Delete an event within a parent scope.
   */
  async delete(calendarId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.deleteEvent`, {
      calendarId,
      id,
    })
  }

  /**
   * Show the event or to-do in the calendar window
   */
  async show(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.show`, {})
  }
}
