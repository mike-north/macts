/**
 * OpenFileAlarm client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { OpenFileAlarm, OpenFileAlarmCreateInput, OpenFileAlarmUpdateInput } from '../types.js'

/**
 * Client for an 'open file' alarm.
 */
export class OpenFileAlarmResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all openfilealarms.
   */
  async list(): Promise<OpenFileAlarm[]> {
    return this.#http.rpc<OpenFileAlarm[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a openfilealarm by id.
   */
  async get(id: string): Promise<OpenFileAlarm> {
    return this.#http.rpc<OpenFileAlarm>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new openfilealarm.
   */
  async create(input: OpenFileAlarmCreateInput): Promise<OpenFileAlarm> {
    return this.#http.rpc<OpenFileAlarm>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing openfilealarm.
   */
  async update(id: string, input: OpenFileAlarmUpdateInput): Promise<OpenFileAlarm> {
    return this.#http.rpc<OpenFileAlarm>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a openfilealarm.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
