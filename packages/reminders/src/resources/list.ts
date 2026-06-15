/**
 * List client for Reminders SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { List, ListCreateInput } from '../types.js'

/**
 * Client for a list of reminders.
 */
export class ListResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all lists.
   */
  async list(): Promise<List[]> {
    return this.#http.rpc<List[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a list by id.
   */
  async get(id: string): Promise<List> {
    return this.#http.rpc<List>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new list.
   */
  async create(input: ListCreateInput): Promise<List> {
    return this.#http.rpc<List>(`${this.#app}.${this.#resource}.create`, input)
  }
}
