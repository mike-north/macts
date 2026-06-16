/**
 * Event client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Event, EventCreateInput } from '../types.js'

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
   * Get a event by id.
   */
  async get(id: string): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.getEvent`, { id })
  }

  /**
   * Create a new event.
   */
  async create(input: EventCreateInput): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.createEvent`, input)
  }

  /**
   * Show the event or to-do in the calendar window
   */
  async show(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.show`, {})
  }
}
