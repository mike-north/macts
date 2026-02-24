/**
 * Attendee client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Attendee, AttendeeCreateInput, AttendeeUpdateInput } from '../types.js'

/**
 * Client for an event attendee.
 */
export class AttendeeResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all attendees.
   */
  async list(): Promise<Attendee[]> {
    return this.#http.rpc<Attendee[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a attendee by id.
   */
  async get(id: string): Promise<Attendee> {
    return this.#http.rpc<Attendee>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new attendee.
   */
  async create(input: AttendeeCreateInput): Promise<Attendee> {
    return this.#http.rpc<Attendee>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing attendee.
   */
  async update(id: string, input: AttendeeUpdateInput): Promise<Attendee> {
    return this.#http.rpc<Attendee>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a attendee.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
