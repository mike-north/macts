/**
 * Calendar client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Calendar, CalendarCreateInput } from '../types.js'

/**
 * Client for a calendar containing events.
 */
export class CalendarResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all calendars, as one page.
   */
  async list(): Promise<Page<Calendar>> {
    return this.#http.rpc<Page<Calendar>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a calendar by id.
   * When several calendars share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(id: string): Promise<Calendar> {
    return this.#http.rpc<Calendar>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new calendar.
   */
  async create(input: CalendarCreateInput): Promise<Calendar> {
    return this.#http.rpc<Calendar>(`${this.#app}.${this.#resource}.create`, input)
  }
}
