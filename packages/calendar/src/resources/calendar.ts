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
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Calendar>> {
    return this.#http.invoke<Page<Calendar>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Calendar'
    )
  }

  /**
   * Get a calendar by id.
   * When several calendars share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Calendar> {
    return this.#http.invoke<Calendar>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Calendar'
    )
  }

  /**
   * Create a new calendar.
   */
  async create(
    input: CalendarCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Calendar> {
    return this.#http.invoke<Calendar>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Calendar'
    )
  }
}
