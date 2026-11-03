/**
 * Calendar client for Calendar SDK.
 * Auto-generated - do not edit.
 */

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
   * List calendars, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Calendar[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Calendar[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a calendar by id.
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
