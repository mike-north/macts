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
  async list(
    calendarId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Event>> {
    return this.#http.invoke<Page<Event>>(
      `${this.#app}.${this.#resource}.list`,
      { calendarId },
      __mactsOptions
    )
  }

  /**
   * Get a event by id within a parent scope.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async get(
    calendarId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Event> {
    return this.#http.invoke<Event>(
      `${this.#app}.${this.#resource}.get`,
      { calendarId, id },
      __mactsOptions
    )
  }

  /**
   * Create a new event.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async create(
    input: EventCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Event> {
    return this.#http.invoke<Event>(`${this.#app}.${this.#resource}.create`, input, __mactsOptions)
  }

  /**
   * Update an existing event within a parent scope.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async update(
    calendarId: string,
    id: string,
    input: EventUpdateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Event> {
    const { calendarId: _p, ...updateFields } = input as EventUpdateInput & { calendarId?: string }
    void _p
    const defined = Object.fromEntries(
      Object.entries(updateFields as Record<string, unknown>).filter(([, v]) => v !== undefined)
    )
    return this.#http.invoke<Event>(
      `${this.#app}.${this.#resource}.update`,
      { calendarId, id, ...defined },
      __mactsOptions
    )
  }

  /**
   * Delete an event within a parent scope.
   * When several calendars share the same name, the first match in the app's order is used as the calendar.
   */
  async delete(
    calendarId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.delete`,
      { calendarId, id },
      __mactsOptions
    )
  }

  /**
   * Show the event or to-do in the calendar window
   */
  async show(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(`${this.#app}.${this.#resource}.show`, {}, __mactsOptions)
  }
}
