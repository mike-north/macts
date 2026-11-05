/**
 * Event client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List the events of one calendar, as one page.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async list(calendarId: string): Promise<Page<Event>> {
    return this.#http.rpc<Page<Event>>(`${this.#app}.${this.#resource}.list`, { calendarId })
  }

  /**
   * Get a event by id within a parent scope.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async get(calendarId: string, id: string): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.get`, { calendarId, id })
  }

  /**
   * Create a new event.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async create(input: EventCreateInput): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing event within a parent scope.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
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
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async delete(calendarId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { calendarId, id })
  }

  /**
   * Show the event or to-do in the calendar window.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async show(calendarId: string, id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.show`, { calendarId, id })
  }
}
